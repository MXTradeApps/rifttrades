# Phase 4 — Cloud sync

Sync binder, want list, lend groups, trade history, and settings to the signed-in
account. This is the largest phase and the one that can destroy user data.

Prerequisite: Phase 3 is `Done`.

## Read this before you start

Three rules. Breaking any one of them loses real data.

**1. The table names are `rift_`-prefixed.** The source app writes to
`binder_entries`, `lend_groups`, `trades`, and `user_settings`. Those tables exist
and hold Flesh and Blood data. Writing to them mixes two games' collections
together and the merge will tombstone the other game's rows. The mapping is in
`CONVENTIONS.md`.

**2. Never rename a SharedPreferences key.** `collection_entries`,
`lend_groups`, `saved_trades`, and `app_settings` are where every existing user's
data already lives. `lend_repository.dart`'s `'lend_groups'` is one of these — it
is a *storage key*, not the table, and it does **not** get a `rift_` prefix. The
full "do not change" list is in `CONVENTIONS.md`.

**3. `save()` and `saveSynced()` are not interchangeable.** `save()` records the
change in the sync journal, marking it as an edit made on this device.
`saveSynced()` writes without journalling. Use `save()` only for user edits, and
`saveSynced()` for merge results and the account-switch discard. Getting it
backwards either makes this device win every merge or silently tombstones data
the user still has.

## Steps

### 1. Write the migration

Create `supabase/migrations/<timestamp>_rift_cloud_sync_user_data.sql`. Use a
timestamp later than the Phase 1 baseline.

```sql
-- Per-account sync tables for RiftTrades.
--
-- `updated_at` is supplied by the client, not defaulted server-side: the merge is
-- last-write-wins across devices, so the timestamp has to mean "when the user
-- made this change", not "when the row reached Postgres".
--
-- Deletes are tombstones (`deleted_at`), never row removals. A client that pulls
-- a full list cannot otherwise tell a record deleted elsewhere from one it has
-- never seen, and would resurrect it.
--
-- These are `rift_`-prefixed because the unprefixed equivalents in this project
-- belong to FAB Trades and hold its users' data.

create table if not exists public.rift_binder_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users on delete cascade,
  card_id    text        not null,
  is_wanted  boolean     not null default false,
  quantity   integer     not null default 1 check (quantity > 0),
  condition  text        not null default 'NM',
  card       jsonb       not null,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, card_id, is_wanted)
);

create table if not exists public.rift_lend_groups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users on delete cascade,
  client_id    text        not null,
  person_name  text,
  is_borrowing boolean     not null default false,
  items        jsonb       not null default '[]',
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  deleted_at   timestamptz,
  unique (user_id, client_id)
);

create table if not exists public.rift_trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users on delete cascade,
  client_id       text        not null,
  name            text,
  have_list       jsonb       not null,
  want_list       jsonb       not null,
  have_total      numeric(10,2),
  want_total      numeric(10,2),
  diff            numeric(10,2),
  have_cash       numeric(10,2) not null default 0,
  want_cash       numeric(10,2) not null default 0,
  currency_symbol text        not null default '$',
  notes           text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (user_id, client_id)
);

-- One row per user. Reset is an update, so there is no delete policy below.
create table if not exists public.rift_user_settings (
  user_id      uuid primary key references auth.users on delete cascade,
  price_source text        not null default 'tcgplayer' check (price_source in ('tcgplayer','cardmarket')),
  theme_mode   text        not null default 'dark'      check (theme_mode  in ('light','dark')),
  updated_at   timestamptz not null default now()
);

create index if not exists rift_binder_entries_user_id_updated_at_idx
  on public.rift_binder_entries (user_id, updated_at desc);
create index if not exists rift_lend_groups_user_id_updated_at_idx
  on public.rift_lend_groups (user_id, updated_at desc);
create index if not exists rift_trades_user_id_updated_at_idx
  on public.rift_trades (user_id, updated_at desc);

alter table public.rift_binder_entries enable row level security;
alter table public.rift_lend_groups     enable row level security;
alter table public.rift_trades          enable row level security;
alter table public.rift_user_settings   enable row level security;
```

Then, for each of the four tables, add the RLS policies. `rift_binder_entries`,
`rift_lend_groups`, and `rift_trades` get all four verbs; `rift_user_settings`
gets select, insert, and update but **no delete**. Follow this shape for each:

```sql
create policy "Users can view own rift_binder_entries"
  on public.rift_binder_entries for select using (auth.uid() = user_id);
create policy "Users can insert own rift_binder_entries"
  on public.rift_binder_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own rift_binder_entries"
  on public.rift_binder_entries for update using (auth.uid() = user_id)
                                          with check (auth.uid() = user_id);
create policy "Users can delete own rift_binder_entries"
  on public.rift_binder_entries for delete using (auth.uid() = user_id);
```

The `with check` on update is not optional. Without it a user could update their
own row and reassign `user_id` to someone else.

### 2. Apply the migration

`db push` does not work from this repo: the shared project has FAB Trades
migration versions that will never have files here, so the CLI aborts before
applying anything. This migration was applied on **both** production
(`tenrvaghaspwdvnwvgrh`) and staging (`cnmxaccamqshgvesieez`) by running the
SQL directly against each database (SQL editor or Supabase MCP `execute_sql`),
then recording the version by hand:

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20260726143000', 'rift_cloud_sync_user_data');
```

Confirm with `npx supabase migration list` (after linking each project) that the
version appears on both remotes. Never run `db pull`, `db diff`, or `db reset`
against the shared project.

### 3. Copy the sync core

All to the same relative path. Apply the import rename, plus the table change
where noted.

| Source file | Table change |
| --- | --- |
| `lib/core/sync/sync_record.dart` | none |
| `lib/core/sync/sync_adapter.dart` | none |
| `lib/core/sync/sync_journal.dart` | **none** — the `'trades'` in it is a journal key, not a table |
| `lib/core/sync/collection_sync.dart` | none |
| `lib/core/sync/remote_store.dart` | `'user_settings'` → `'rift_user_settings'`, **two places** (~line 86 and ~line 98) |
| `lib/core/sync/binder_sync.dart` | `'binder_entries'` → `'rift_binder_entries'` |
| `lib/core/sync/lend_sync.dart` | `'lend_groups'` → `'rift_lend_groups'` |
| `lib/core/sync/trade_sync.dart` | `'trades'` → `'rift_trades'` |
| `lib/core/sync/settings_sync.dart` | none |
| `lib/core/data/cached_collection.dart` | none |
| `lib/features/sync/sync_host.dart` | none |

`sync_host.dart` watches `purchasesIdentityProvider`, which does not exist until
Phase 5. Remove that one watch for now and add it back in Phase 5.

### 4. Fix the paging bug while copying `remote_store.dart`

The source `fetchAll` does not order or page, and `config.toml` caps responses at
1,000 rows, so a large binder pulls a nondeterministic subset. Replace the source
version with:

```dart
  @override
  Future<List<Map<String, dynamic>>> fetchAll(String userId) async {
    // PostgREST caps a response at max_rows (1000). Without an order the cap
    // also makes which rows come back arbitrary, so page explicitly.
    const pageSize = 1000;
    final all = <Map<String, dynamic>>[];
    for (var from = 0;; from += pageSize) {
      final page = await client
          .from(table)
          .select()
          .eq('user_id', userId)
          .order('id')
          .range(from, from + pageSize - 1);
      final rows = page.cast<Map<String, dynamic>>();
      all.addAll(rows);
      if (rows.length < pageSize) break;
    }
    return all;
  }
```

### 5. Convert the four repositories

`binder_repository.dart`, `lend_repository.dart`, and `trade_repository.dart`
become `CachedCollection` subclasses. `settings_repository.dart` gains journal
awareness. Read both the RiftTrades and source versions of each — they differ
(the RiftTrades ones are longer) — and edit the RiftTrades version.

For each: keep `storageKey` **exactly** as it is, keep the existing
`encode`/`decode` JSON shape exactly as it is, and add the `adapter` getter.

Changing the JSON shape orphans existing users' data just as surely as renaming
the key.

### 6. Wire the sync providers into `lib/core/providers.dart`

Add, from the source's lines ~245–329:

- `syncJournalProvider`
- `syncServiceProvider` — built with `SyncService.forSupabase(...)`
- `SyncStatus` (`isSyncing`, `lastSyncedAt`, `error`)
- `SyncNotifier` with `build()` auto-syncing when an account appears, `sync(userId)`,
  and `_refreshChangedScreens(outcome)`
- `syncProvider`

`_refreshChangedScreens` must invalidate only the domains that changed —
`binderProvider`, `lendProvider`, `tradeHistoryProvider`, `settingsProvider` —
based on the `SyncOutcome` flags. Invalidating all four on every sync makes the
whole UI flash.

### 7. Mount `SyncHost` and restore the sync tile

In `lib/app/app.dart`, wrap the home widget in `SyncHost`. RiftTrades' existing
update-check wrapper stays; put `SyncHost` outside it.

Then restore the `_SyncTile` in `lib/features/settings/account_section.dart` that
you removed in Phase 3, including the manual "Sync now" action calling
`ref.read(syncProvider.notifier).sync(account.id)`.

### 8. Copy the tests

| Source | Target |
| --- | --- |
| `test/core/sync/merge_test.dart` | same |
| `test/core/sync/sync_journal_test.dart` | same |
| `test/core/sync/collection_sync_test.dart` | same |
| `test/core/sync/settings_sync_test.dart` | same |
| `test/core/sync/sync_service_test.dart` | same |
| `test/support/sync_stub.dart` | same |
| `test/widgets/sync_host_test.dart` | same |

That is roughly 1,200 lines of tests and they are the reason this phase is
verifiable at all. Copy them all. Fixture helpers may need adjusting to
RiftTrades' `buildCard()` in `test/support/fixtures.dart`.

Also update `test/support/harness.dart` to override `syncProvider` with
`StubSyncNotifier`, so existing widget tests do not start hitting the network.

### 9. Add a test for the paging fix

The source has no test for step 4, so write one: a fake remote holding more than
1,000 rows for one user, and an assertion that `fetchAll` returns all of them.

## Verify

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count up by roughly 60 or more
- [ ] **No bare table name is used anywhere.** This is the most important check
      in the whole port:

```powershell
Select-String -Path lib -Include *.dart -Pattern "'(binder_entries|user_settings|entitlements|billing_events)'"
```

  Must return **nothing**. Then:

```powershell
Select-String -Path lib\core\sync -Include *.dart -Pattern "=> 'trades'|=> 'lend_groups'"
```

  Must return nothing. (`sync_journal.dart`'s `trades('trades')` is fine and will
  not match these patterns.)

- [ ] The four storage keys are untouched:

```powershell
Select-String -Path lib\core\data -Include *.dart -Pattern "collection_entries|saved_trades|app_settings|'lend_groups'"
```

  All four must still be present.

- [ ] No `rift_` prefix leaked onto a storage key:

```powershell
Select-String -Path lib\core\data -Include *.dart -Pattern "rift_collection_entries|rift_saved_trades|rift_app_settings"
```

  Must return nothing.

### Manual check — needs a human and two devices or a reinstall

1. On a signed-out install, add cards to the binder. Sign in. Confirm the cards
   upload rather than vanish — first sign-in merges local data upward.
2. On a second device with the same account, confirm the cards arrive.
3. Delete a card on device A, sync both, and confirm it does **not** come back on
   device B.
4. Sign out on device A and sign in as a **different** account. Confirm the first
   account's binder is gone locally, and that settings are kept.
5. Sign back in as the first account and confirm the binder returns from the
   server.

Step 4 is the account-switch discard. If the first account's cards appear in the
second account's binder, stop immediately — the discard is not working and it will
corrupt real data.

## Commit

```powershell
git add -A
git commit -m "Sync binder, lend, trades, and settings per account"
```

Set Phase 4 to `Done` in `docs/port/README.md`.
