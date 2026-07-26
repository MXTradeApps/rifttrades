/**
 * Conditional writes for `rift_entitlements`, so concurrent webhook deliveries
 * cannot clobber a newer state with an older one.
 *
 * The race without this: delivery A reads the subscriber, delivery B reads it, B
 * writes, then A writes with its older view and leaves a paying customer inactive.
 * The nightly sweep used to filter on `is_active = true`, so that wrong row was
 * invisible forever.
 */

import type { EntitlementState } from './entitlement.ts';

/**
 * The database operations a conditional entitlement write needs.
 *
 * Kept as a small surface so the algorithm can be unit-tested with an in-memory
 * fake instead of Postgres.
 */
export interface EntitlementWriter {
  /**
   * Updates the row only when `updated_at <= readAt`.
   *
   * @returns true when a row was actually updated.
   */
  updateIfCurrent(
    userId: string,
    row: Record<string, unknown>,
    readAt: string,
  ): Promise<boolean>;

  /** The row's `updated_at`, or null when no row exists. */
  getUpdatedAt(userId: string): Promise<string | null>;

  /**
   * Inserts a new row.
   *
   * @returns `'conflict'` when another writer inserted first (unique violation).
   */
  insert(row: Record<string, unknown>): Promise<'ok' | 'conflict'>;
}

/**
 * Writes `state` for `userId`, but only if nothing newer has landed since `readAt`.
 *
 * `readAt` must be captured immediately *before* the RevenueCat fetch that produced
 * `state`. Capturing after the fetch would let a concurrent write that completed
 * during the fetch look older than this one, and get overwritten.
 */
export async function saveEntitlementRow(
  writer: EntitlementWriter,
  userId: string,
  state: EntitlementState,
  readAt: Date,
): Promise<void> {
  const readAtIso = readAt.toISOString();
  const row: Record<string, unknown> = {
    user_id: userId,
    ...state,
    updated_at: new Date().toISOString(),
  };

  if (await writer.updateIfCurrent(userId, row, readAtIso)) return;

  const existingUpdatedAt = await writer.getUpdatedAt(userId);
  if (existingUpdatedAt === null) {
    const result = await writer.insert(row);
    if (result === 'conflict') {
      // Two deliveries for a brand-new customer both found no row. The other insert
      // won; treating that as success avoids a 500 retry loop over a resolved race.
      console.log(
        `Skipped entitlement insert for ${userId}: concurrent insert already won`,
      );
    }
    return;
  }

  if (new Date(existingUpdatedAt).getTime() > new Date(readAtIso).getTime()) {
    console.log(
      `Skipped entitlement write for ${userId}: newer write already landed ` +
        `(updated_at=${existingUpdatedAt}, readAt=${readAtIso})`,
    );
    return;
  }

  // Row exists and is still not newer than readAt, yet the conditional update
  // matched nothing — retry once in case of a narrow delete/reinsert window.
  if (await writer.updateIfCurrent(userId, row, readAtIso)) return;

  console.warn(
    `Skipped entitlement write for ${userId}: conditional update matched no row ` +
      `despite updated_at=${existingUpdatedAt} <= readAt=${readAtIso}`,
  );
}

/**
 * Wires a Supabase service-role client to {@link EntitlementWriter}.
 *
 * `supabase` is deliberately untyped beyond `.from`: constraining it to a hand-
 * written fluent shape makes the type checker recurse through supabase-js's
 * generics until it hits "Type instantiation is excessively deep".
 */
export function supabaseEntitlementWriter(
  // deno-lint-ignore no-explicit-any
  supabase: { from: (table: string) => any },
  tableName: string,
): EntitlementWriter {
  return {
    async updateIfCurrent(userId, row, readAt) {
      const { data, error } = await supabase
        .from(tableName)
        .update(row)
        .eq('user_id', userId)
        .lte('updated_at', readAt)
        .select('user_id');
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },

    async getUpdatedAt(userId) {
      const { data, error } = await supabase
        .from(tableName)
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      const updatedAt = data?.updated_at;
      return typeof updatedAt === 'string' ? updatedAt : null;
    },

    async insert(row) {
      const { error } = await supabase.from(tableName).insert(row);
      if (!error) return 'ok';
      // Postgres unique_violation — the insert-insert race for a new customer.
      if (error.code === '23505') return 'conflict';
      throw error;
    },
  };
}
