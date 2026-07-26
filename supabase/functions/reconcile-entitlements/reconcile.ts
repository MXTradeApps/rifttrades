/**
 * The nightly sweep's logic, with Postgres and RevenueCat held at arm's length.
 *
 * Separated from `index.ts` so the parts that decide who gets checked, what counts
 * as a change, and what happens when one customer fails can be tested without
 * either service.
 */

import { FREE, readEntitlement } from '../_shared/entitlement.ts';
import type { EntitlementState, RevenueCatSubscriber } from '../_shared/entitlement.ts';

/**
 * How far past an expiry to keep re-checking — and how recently a row must have
 * been deactivated to still be eligible for repair.
 *
 * A renewal can be recorded hours late and a failing card retried for days. Give up
 * after a week: by then the row says "expired", which is also the answer.
 *
 * The same window bounds "recently deactivated": a concurrent-webhook race that
 * left `is_active = false` writes `updated_at` at the moment of damage, so the next
 * nightly run can still see the row. Wider than a week would re-check long-free
 * users; narrower risks missing a bad write that landed just before the sweep.
 */
export const GRACE_WINDOW_DAYS = 7;

/** How far ahead to look, so a renewal is picked up rather than read as a lapse. */
export const LOOKAHEAD_HOURS = 36;

/**
 * Every column `readEntitlement` derives, plus the key and `updated_at`.
 *
 * `updated_at` is not derived by the mapping — it is needed so the sweep can tell a
 * recently-deactivated row from one that has been free for months.
 *
 * Derived columns are read off `FREE` rather than written out by hand, because a
 * column left out of the select reads as unchanged — it would silently stop being
 * reconciled.
 */
export const TRACKED_COLUMNS = ['user_id', ...Object.keys(FREE), 'updated_at'].join(
  ', ',
);

/**
 * A stored entitlement row, as far as reconciliation cares.
 *
 * Columns are optional and indexed by name because the comparison walks them
 * generically: a row selected without one of them must read as *changed*, not as
 * absent, or that column would quietly stop being reconciled.
 */
export interface EntitlementRow extends Partial<EntitlementState> {
  user_id: string;
  [column: string]: unknown;
}

export interface ReconcileDeps {
  entitlementId: string;
  /**
   * Rows whose expiry falls in [from, to].
   *
   * May include inactive rows; {@link reconcile} keeps only active ones and those
   * deactivated inside the grace window via {@link isSweepCandidate}.
   */
  listDue(from: string, to: string): Promise<EntitlementRow[]>;
  /**
   * Persists `state` as observed at `readAt`.
   *
   * Same conditional-write contract as the webhook store: refuse to clobber a
   * newer concurrent write.
   */
  saveEntitlement(
    userId: string,
    state: EntitlementState,
    readAt: Date,
  ): Promise<void>;
  fetchSubscriber(
    appUserId: string,
    isSandbox?: boolean,
  ): Promise<RevenueCatSubscriber | null>;
  now?: Date;
}

export interface ReconcileResult {
  checked: number;
  changed: number;
  failed: string[];
}

export async function reconcile(deps: ReconcileDeps): Promise<ReconcileResult> {
  const now = deps.now ?? new Date();
  const from = new Date(now.getTime() - GRACE_WINDOW_DAYS * 86_400_000);
  const to = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);

  const candidates = await deps.listDue(from.toISOString(), to.toISOString());
  // Active-only would make a wrongly-deactivated paying customer invisible forever.
  // Keep recently-deactivated rows so the same night can repair concurrent-write damage.
  const due = candidates.filter((row) => isSweepCandidate(row, from));

  let changed = 0;
  const failed: string[] = [];

  // Sequential on purpose: this runs unattended against a third-party API, and the
  // set is small by construction, so parallel requests risk rate limiting for no gain.
  for (const row of due) {
    try {
      // Same placement as the webhook: the "as of" for the state we may write.
      const readAt = new Date();
      const subscriber = await deps.fetchSubscriber(
        row.user_id,
        row.is_sandbox === true,
      );
      const state = readEntitlement(subscriber, deps.entitlementId, now);

      // Only write when something actually moved, so `updated_at` keeps meaning
      // "when this last changed" rather than "when a job last ran".
      if (!differs(row, state)) continue;

      await deps.saveEntitlement(row.user_id, state, readAt);
      changed++;
      console.log(
        `Reconciled ${row.user_id}: ${row.tier} -> ${state.tier}, ` +
          `expires ${row.expires_at} -> ${state.expires_at}`,
      );
    } catch (error) {
      // One unreachable customer must not abandon the rest of the sweep, and
      // tomorrow's run picks them up again regardless.
      failed.push(row.user_id);
      console.error(`Failed to reconcile ${row.user_id}`, error);
    }
  }

  return { checked: due.length, changed, failed };
}

/**
 * Whether a near-expiry row belongs in tonight's RevenueCat re-check.
 *
 * Active rows are the main set. Rows deactivated inside the grace window are
 * included so a concurrent webhook write that left `is_active = false` is repaired
 * the same night rather than never — the old active-only filter could not see them.
 */
export function isSweepCandidate(
  row: EntitlementRow,
  graceWindowStart: Date,
): boolean {
  if (row.is_active === true) return true;
  const updatedAt = row.updated_at;
  if (updatedAt == null) return false;
  const at = new Date(String(updatedAt)).getTime();
  if (Number.isNaN(at)) return false;
  return at >= graceWindowStart.getTime();
}

/**
 * Whether the stored row disagrees with what RevenueCat now reports.
 *
 * Compares every field `readEntitlement` derives, not just the tier. A renewal moves
 * only `expires_at`, and skipping that write would leave the row permanently stale:
 * still inside tonight's window, still skipped, every night after.
 */
export function differs(
  row: EntitlementRow,
  state: EntitlementState,
): boolean {
  return Object.entries(state).some(([column, derived]) =>
    column.endsWith('_at')
      ? !sameInstant(row[column], derived)
      : row[column] !== derived
  );
}

/**
 * Timestamp equality that ignores how each side spells it.
 *
 * Postgres returns `2026-07-15T12:00:00+00:00` where RevenueCat sent
 * `2026-07-15T12:00:00Z`. As strings those differ, and every row would look changed
 * on every run — turning a targeted repair into a nightly rewrite of `updated_at`.
 */
function sameInstant(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  const left = new Date(String(a)).getTime();
  const right = new Date(String(b)).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return String(a) === String(b);
  return left === right;
}
