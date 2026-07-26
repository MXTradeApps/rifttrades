import { assertEquals } from 'jsr:@std/assert@1';

import { type EntitlementState, FREE } from './entitlement.ts';
import { type EntitlementWriter, saveEntitlementRow } from './entitlement_store.ts';

const USER = '9f1c0b62-0000-4000-8000-000000000001';

const ACTIVE: EntitlementState = {
  ...FREE,
  tier: 'pro',
  is_active: true,
  source: 'app_store',
  product_id: 'monthly',
  expires_at: '2026-07-20T12:00:00Z',
  rc_customer_id: USER,
};

const INACTIVE: EntitlementState = {
  ...FREE,
  product_id: 'monthly',
  expires_at: '2026-07-20T12:00:00Z',
  rc_customer_id: USER,
};

/** In-memory stand-in for Postgres, including the insert-insert race. */
class MemoryWriter implements EntitlementWriter {
  readonly rows = new Map<string, Record<string, unknown>>();
  /**
   * When set, the next `getUpdatedAt` returns null once (even if a row exists),
   * simulating the window where two deliveries both decide to insert.
   */
  missNextGet = false;

  seed(row: Record<string, unknown>) {
    this.rows.set(String(row.user_id), { ...row });
  }

  updateIfCurrent(userId: string, row: Record<string, unknown>, readAt: string) {
    const existing = this.rows.get(userId);
    if (!existing) return Promise.resolve(false);
    if (
      new Date(String(existing.updated_at)).getTime() > new Date(readAt).getTime()
    ) {
      return Promise.resolve(false);
    }
    this.rows.set(userId, { ...row });
    return Promise.resolve(true);
  }

  getUpdatedAt(userId: string) {
    if (this.missNextGet) {
      this.missNextGet = false;
      return Promise.resolve(null);
    }
    const existing = this.rows.get(userId);
    return Promise.resolve(existing ? String(existing.updated_at) : null);
  }

  insert(row: Record<string, unknown>) {
    const userId = String(row.user_id);
    if (this.rows.has(userId)) return Promise.resolve('conflict' as const);
    this.rows.set(userId, { ...row });
    return Promise.resolve('ok' as const);
  }
}

Deno.test('an out-of-order write does not deactivate an active row', async () => {
  const writer = new MemoryWriter();
  // Newer delivery already landed: active, updated_at = T2.
  writer.seed({
    user_id: USER,
    ...ACTIVE,
    updated_at: '2026-06-15T12:00:02.000Z',
  });

  // Older delivery arrives second with a stale "free" view, readAt = T1 < T2.
  await saveEntitlementRow(
    writer,
    USER,
    INACTIVE,
    new Date('2026-06-15T12:00:01.000Z'),
  );

  // Without the conditional write this would leave is_active=false forever: the
  // nightly sweep filtered active-only and could not see the damaged row.
  assertEquals(writer.rows.get(USER)?.is_active, true);
  assertEquals(writer.rows.get(USER)?.tier, 'pro');
  assertEquals(writer.rows.get(USER)?.updated_at, '2026-06-15T12:00:02.000Z');
});

Deno.test('a first write for a new customer inserts', async () => {
  const writer = new MemoryWriter();

  await saveEntitlementRow(
    writer,
    USER,
    ACTIVE,
    new Date('2026-06-15T12:00:00.000Z'),
  );

  assertEquals(writer.rows.get(USER)?.is_active, true);
});

Deno.test('a concurrent insert for a new customer is not an error', async () => {
  const writer = new MemoryWriter();
  // The other delivery already inserted, but our getUpdatedAt still sees no row —
  // the insert-insert race. We must return without throwing (a 500 would retry
  // forever over a race that already resolved).
  writer.seed({
    user_id: USER,
    ...ACTIVE,
    updated_at: '2026-06-15T12:00:02.000Z',
  });
  writer.missNextGet = true;

  await saveEntitlementRow(
    writer,
    USER,
    INACTIVE,
    new Date('2026-06-15T12:00:01.000Z'),
  );

  assertEquals(writer.rows.get(USER)?.is_active, true);
  assertEquals(writer.rows.get(USER)?.tier, 'pro');
});
