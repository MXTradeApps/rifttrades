# Multi-binder change review — agent handoff

**Date:** 2026-08-22
**Repo:** `/Users/joseescaler/Documents/rifttrades`
**Branch:** `001-fab-parity` (same commit as `main`: `08661fd`)
**Scope:** Uncommitted multi-binder port. 27 modified files + ~218 untracked.
**Verdict:** **Do not ship.** Do not apply `supabase/migrations/20260822200000_rift_multi_binders.sql` to fabloodle until blockers 1–2 and the High items below are fixed.

This file is the review. Another agent should treat it as the source of defects to fix. Do not re-derive the findings from scratch unless a cited line has moved.

## How to use this file

1. Read `docs/port/CONVENTIONS.md` and `docs/port/WEB-CONVENTIONS.md` before editing.
2. Fix in the **Fix order** below. Do not apply the SQL or release either client until items 1–2 are done.
3. Do **not** “fix” anything in **What held up** — those are correct.
4. SharedPreferences keys in CONVENTIONS “Never change” stay as they are (`collection_entries`, `sync_journal_v1`, etc.).
5. Table names stay `rift_*`. Default binder ids stay `system:trade` and `system:collection`.
6. After fixes, add tests named in each finding. Existing tests that lock a bug (web `wantListCards === 50`) must change with the fix.

## What landed (context)

Multi-binder grid: Trade Binder + Collection as defaults, named extra binders, move copies, cover art, value overlay, per-binder free card cap (50), binders paywall (4), sync of `rift_binders` + owned `binder_id` on `rift_binder_entries`. Want List stays separate. Web lives in this repo at `apps/web/`. Spec: `specs/001-fab-parity/`.

Owned identity is now `(printing, binderId, condition)` with sync `client_id` `binder|{binderId}|{cardId}|{condition}`. Want stays `want|{cardId}`.

---

## Fix order

| Order | Work | Why first |
| --- | --- | --- |
| 1 | Remap `sync_journal_v1` keys `binder|{cardId}` → `binder|system:trade|{cardId}|{condition}` | Upgrade path. Existing signed-in users with a dirty journal. |
| 2 | Coordinate SQL + client rollout (or keep old conflict target until clients are forced) | Live sync breaks the moment the unique key drops. |
| 3 | Set web `wantListCards` to 25 and un-pin the 50 tests | Shipped entitlement bypass. |
| 4 | Thread `condition` through `_matchesOwned` / card-detail Own / confirm-trade decrement | New row key is already in `add()` and SQL; mutators still use the old one. |
| 5 | Queue sync from binder CRUD + move; re-seed Trade after account discard | Two-device and account-switch paths. |

Then the Medium/Low items.

---

## Findings

### Blocker — Journal IDs changed with no remap

**Where:** `apps/mobile/lib/core/sync/binder_sync.dart:28-45`, `apps/mobile/lib/core/sync/collection_sync.dart:49-67`

**Was (08661fd):** `idOf` = `binder|{cardId}` / `want|{cardId}`; `conflictTarget` = `user_id,card_id,is_wanted`; `identityFilter` used `is_wanted` + `card_id`.

**Now:** `entryClientId` = `binder|{binderId}|{cardId}|{condition}` / `want|{cardId}`; `conflictTarget` = `user_id,client_id`; `identityFilter` = `{client_id: id}`.

**Why it matters:** `CollectionSync._localRecords` stamps local rows from `journal.localTimestamps(domain)[id]`, else `addedAt`. After upgrade, live rows use new IDs; journal keys stay old.

- Pending qty change stored under `binder|{cardId}` is ignored. Merge falls back to `addedAt`; remote `updated_at` usually wins. Offline edit is dropped.
- Pending delete is a tombstone on the old ID. Remote live row has the new ID, so merge treats them as different records and the card comes back.
- `markDeleted` now filters `{client_id: oldId}`, which will not match backfilled rows.

SQL backfill of `client_id` is correct. The hole is **client journal remapping**. No test seeds a `binder|{cardId}` journal key and syncs against a new-ID remote row.

**Fix:** One-shot rewrite of `SyncDomain.binder` journal keys: `binder|{cardId}` → `binder|system:trade|{cardId}|{condition}` (condition from the local entry, default `NM`). Copy live timestamps and tombstones, drop old keys, then persist remapped `binder_id` on first load. Add a collection-sync test for this upgrade (offline qty, offline delete, fully-synced-then-upgrade).

---

### Blocker — SQL and old clients cannot coexist

**Where:** `supabase/migrations/20260822200000_rift_multi_binders.sql:104`

Migration drops `UNIQUE (user_id, card_id, is_wanted)` and adds `UNIQUE (user_id, client_id)`. Shipping app still upserts on the old conflict target.

**Why it matters:** A production user still on the App Store / Play build will fail binder sync the moment this SQL lands on fabloodle.

**Fix:** Ship migration + both clients together, or force-upgrade the mobile client first. Do not apply this file to fabloodle until the remapped journal and new `conflictTarget` are in the build that users actually run. Document the rollout in the commit / PR.

**Also:** `CREATE POLICY` at lines 33–48 has no `IF NOT EXISTS`. A second apply fails. Data steps are mostly idempotent. Guard the policies (`DROP POLICY IF EXISTS` then create, or equivalent) because CONVENTIONS documents manual SQL apply.

---

### High — Web Want List cap is 50, mobile is 25

**Where:** `apps/web/src/utils/freeLimits.js:17-19`

```js
wantListCards: 50,   // must be 25
loanedCards: 1,      // must be 25 (FAB leftover; unused on web but tests lock it)
```

Mobile `FreeLimits.wantListCards` and both convention files say **25**. File comment says drift is not cosmetic.

**Tests that lock the bug:**

- `apps/web/tests/utils/freeLimits.test.js:11`
- `apps/web/tests/contracts/freeLimits.contract.test.js:17-18`

Mobile contract test already refuses to pin this fixture (`wantListCards: "unchanged"`).

**Fix:** `wantListCards: 25`, `loanedCards: 25`. Update those two tests.

---

### High — Account switch leaves Trade Binder unseeded

**Where:** `apps/mobile/lib/core/sync/sync_service.dart:165-184`, `apps/mobile/lib/core/data/binders_repository.dart:26-41`, `apps/mobile/lib/core/providers.dart:732-737`, `847-848`

`_claimLocalDataFor` discard writes `[]` via `saveSynced` (so the `binders` key **exists**). `loadAndPersistSeed` only seeds when the key is **missing**. After a pull of an empty remote, the grid has no Trade Binder.

Adds still default to `system:trade`. Cards land in a binder that has no tile.

Spec (`data-model.md`) says seed Trade + Collection if missing. `sync_service_test.dart:209-212` asserts `binders.load()` is empty after switch — that locks in the wrong product invariant.

**Fix:** After discard + merge, if there is no live `role=trade` row, seed defaults and `save()` (journaled, so they upload to the new account). Update the test to expect the two defaults. Do **not** resurrect a tombstoned Collection (see High on re-seed divergence).

---

### High — Qty / condition / remove ignore condition

**Where:** `apps/mobile/lib/core/providers.dart:915-957`, `apps/mobile/lib/features/binder/binder_list.dart:419-421,456-461,494-505`

Owned identity is `(printing, binderId, condition)`. `_matchesOwned` only checks printing + binder. `add()` already keys on condition (`849-853`).

Reachable: change a row to LP, add the same printing again (defaults to NM) → two rows. Then:

- stepper sets **both** rows to the same qty
- condition chip rewrites **both**
- swipe-delete removes **both**

`notifiers_test.dart` “updates only the matching entry” only ever creates one row.

**Fix:** Thread `condition` through `_matchesOwned`, `setQuantity`, `setCondition`, `remove`, `quantityOf`, and the list UI. Add a two-condition notifier test.

---

### High — Card-detail Own badge sums every binder, then writes one

**Where:** `apps/mobile/lib/features/card_detail/card_detail_screen.dart:37-39,186-191`

Badge folds quantity of that printing across **all** owned binders. Save calls `setQuantity(..., binderId: openBinderId ?? trade)`.

Example: 2 in Trade, 3 in Collection → badge `Own 5`. From Collection, set to 5 → Collection becomes 5, total 7. From Browse (`openBinderId == null`) the write hits Trade only. Combined with the condition bug, every condition in that binder is overwritten.

**Fix:** Badge and editor must use the same scope (open binder, or a per-binder breakdown). Do not sum all binders and write one.

---

### High — Create / rename / delete / move never queue sync

**Where:** `apps/mobile/lib/features/binder/binder_screen.dart:241-273`, `apps/mobile/lib/features/binder/binder_list.dart:381-387`, `apps/mobile/lib/features/paywall/pro_limits.dart:41`, `apps/mobile/lib/core/providers.dart:755,831,992-994`

`CachedCollection.save` journals those writes. Only `addToBinderOrUpsell` calls `queueSyncAfterBinderChange` (`apps/mobile/lib/features/sync/sync_actions.dart`). Moves, binder CRUD, and `applyTradeConfirm` wait for next launch or pull-to-refresh.

**Fix:** Call `queueSyncAfterBinderChange` from those persist paths (or from `_persist` in both notifiers when signed in).

---

### High — Collection re-seed disagrees across spec, mobile, and web

**Where:** `apps/mobile/lib/core/data/binders_repository.dart`, `apps/web/src/services/binder.js:267-277`, `specs/001-fab-parity/contracts/binders.md:18-19`, `data-model.md:21`

- Spec/contracts: seed Collection if missing.
- Mobile: only first-run `seedDefaults()`; `ensureTrade` never resurrects Collection. Correct for explicit delete.
- Web: `getBinders()` re-upserts missing defaults.

**Why it matters:** Collection deleted on mobile can reappear from web.

**Fix:** Pick one product rule and implement it on both clients. Recommended: match mobile — never resurrect a tombstoned Collection; always keep a live Trade Binder. Update the spec/contract if they currently say “always if missing.”

---

### Medium — Share token written to PostHog

**Where:** `apps/web/src/pages/SharedBinder.jsx:183,190` (`shared_binder_view_failed`, `shared_binder_viewed`). Same pattern at `:288` (`shared_binder_add_to_trade`).

`capture(..., { token })` stores the capability secret that unlocks `/b/:token`. Anyone with project access or an export can open every viewed binder.

**Fix:** Drop `token`, or hash it.

---

### Medium — Unawaited first-run seed persist can race sync

**Where:** `apps/mobile/lib/core/data/binders_repository.dart:35-40`, `apps/mobile/lib/core/providers.dart:283-291,734-736`

`loadAndPersistSeed` calls `save()` without awaiting. `IndexedStack` always builds `BinderScreen`, so this runs on every signed-in first launch alongside `SyncNotifier`’s microtask sync.

If `save()`’s `load()` for fingerprints runs **after** `saveSynced` of remote binders, `before` includes remote extras and `after` is only the two seeds — those extras are journaled as deletes and pushed. Web-created binders are the realistic casualty.

**Fix:** Await persist (or write seeds synchronously) before any sync; never seed-write a list that is a subset of disk.

---

### Medium — `openBinderId` survives Browse and scan

**Where:** `apps/mobile/lib/core/providers.dart:719-730`, `apps/mobile/lib/app/card_actions.dart:35-37`, `apps/mobile/lib/features/scan/scan_screen.dart:747`

`IndexedStack` keeps Binder drilled-in. Browse / scan / detail “Add to Binder” uses `openBinderId ?? trade`, so adds go to Collection while the user is on Browse.

**Fix:** Destination should be the visible binder list, or copy should say which binder is receiving the add.

---

### Medium — Confirm Trade decrements the first Trade row, not a condition

**Where:** `apps/mobile/lib/core/logic/confirm_trade.dart:72-83`

`_add` matches condition (NM merge). `_decrement` matches printing + binder only. With NM + LP in Trade Binder, given-side decrement hits whichever row is first (adds prepend). Collection isolation is tested and correct — do not regress that.

**Fix:** Prefer NM, or decrement across conditions in list order until qty is satisfied, and test it.

---

### Medium — Value chip and cover ignore the snapshot contract

**Where:** `apps/mobile/lib/features/binder/binder_screen.dart:106-107`, `apps/mobile/lib/features/binder/binder_value_sheet.dart:44-47,78`, `apps/mobile/lib/features/binder/binder_grid.dart:127-129`

Grid tiles use `isPricedField` and show `—`. Chip and overlay headline use `(pricing.value ?? 0)` and `formatValue` → `$0.00` / `€0.00`. Spec: non-empty all-unpriced is `—`.

Cover art: `pickBinderCover(...)` defaults to `PriceSource.tcgplayer`. Tile **value** uses Settings. CardMarket users get a TCG-max cover.

**Fix:** Reuse `binderTileValueLabel` (or `MoneyTotal.amount == null → —`) for chip and headline. Pass `ref.watch(settingsProvider).source` into `pickBinderCover`.

---

### Medium — Web list identity and moves are weaker than mobile

**Where:**

- `apps/web/src/pages/BinderCollection.jsx:403,492,1156` — UI identity is `cardId` only. `SharedBinder.jsx:437` same key. Search-add finds the first `cardId` in the open Binder and bumps that row (LP from mobile becomes the qty target instead of a new NM).
- `apps/web/src/services/binder.js:898` — move reduces/tombstones source, then upserts dest. If the second call fails, copies disappear.
- `apps/web/src/utils/binderMove.js:62` — compare is `(e.binderId || null) === fromBinderId`. Mobile uses `resolvedBinderId` (null/empty → `system:trade`). Pure function + contract fixtures do not, so LWW rows with missing `binder_id` refuse `missing-source`.
- `apps/web/src/services/binder.js:827` — Trade Binder delete checks `clientId === 'system:trade'`, not `role === 'trade'`.

**Fix:** Key and match on `` `${binderId}|${cardId}|${condition}` ``. Upsert dest first, then source (or one RPC). Use `entry.binderId || TRADE_BINDER_ID` in `moveBinderCopies`. Refuse delete when `role === 'trade'`.

---

### Medium — Binder IDs and `binders=4` cap are off-contract

**Where:** `apps/mobile/lib/core/providers.dart:768-777`, `docs/port/CONVENTIONS.md:62-72`, `apps/mobile/lib/core/logic/free_limits.dart:17-19`

Spec / `ARCHITECTURE.md` say user binders are UUIDs. `create()` uses `microsecondsSinceEpoch.toString()` (matches FAB, not the written contract).

`FreeLimits.binders = 4` is not in CONVENTIONS. Constitution says mobile caps live there. `free_limits_test.dart` pins the old four caps and omits `binders`. Contract tests pin 4.

**Fix:** Use a UUID. Add a `binders` row to CONVENTIONS (and WEB-CONVENTIONS) and pin it in the documented-caps test. Add `'binders'` to the CONVENTIONS never-change prefs list (`BindersRepository.storageKey`).

---

### Medium — Public share has no client-side Collection filter

**Where:** `apps/web/src/services/binder.js:701`

New RPC join on `role = 'trade'` is correct. `getPublicBinder` still stamps every RPC row as `binderId: TRADE_BINDER_ID` and never uses `filterTradeBinderEntries`. If web ships **before** this SQL is applied, the old `SECURITY DEFINER` body returns **all** owned rows (no `binder_id`). Collection leaks on the share link.

**Fix:** Apply the migration before/with the web deploy (blocked on blockers 1–2). Optionally add `binder_id` to the RPC payload and drop non-trade rows on the client.

---

### Medium — Web binder writes trust the caller for Pro

**Where:** `apps/web/src/services/binder.js:361,728,865`

`upsertEntry` never calls `checkCanAddBinderCard`. `createBinder` / `applyBinderMove` take `isPro` from the UI. `tradeHistory.js` re-reads `rift_entitlements`. RLS only checks `auth.uid() = user_id`, so the 4-binder and 50-card caps are UI-only. Mobile is the same class of client gate; the inconsistency is that web history is stricter than binders.

**Fix:** Have `createBinder` / `applyBinderMove` call `fetchEntitlement` like `trimToFreeWindow`. Keep `checkCanAddBinderCard` on the add path or delete it.

---

### Low

- **Delete binder has no confirmation** — `apps/mobile/lib/features/binder/binder_screen.dart:272-273`. Empty Collection tombstoned in one tap. Occupied delete is refused (cards safe).
- **New-device seed can resurrect a deleted Collection** — `binders_repository.dart:26-32`. New install with no `binders` key always seeds Collection with `DateTime.now()`, which can LWW over a remote tombstone.
- **Package name** `apps/web/package.json` is still `riftrades`.
- **FAB leftovers:** `apps/web/src/hooks/useSets.js:6` comment; `BinderCollection.jsx:800` and `SharedBinder.jsx:518` FAB brown hover (`139, 69, 19`, `#5d2f0d`).
- **Unused:** `filterTradeBinderEntries` and `checkCanAddBinderCard` unused in the app (`binder.js:54,482`).
- **`binderCover.js:67`** re-exports `TRADE_BINDER_ID` / `COLLECTION_BINDER_ID`; canonical copies live in `binder.js`.
- **`BinderCollection.jsx:672`** unknown dest name shows “Want List is not a Binder destination”.
- **`BinderCollection.jsx:1525`** error toasts still use `severity="success"`.
- **`binderValueSnapshot.js:65`** foil inferred with `/foil/i`; mobile uses `card.isFoil` only.
- **`BinderCollection.jsx:1061`** `SearchInput disabled={atFreeLimit}` also blocks searching cards already in the list.
- **`delete-account` comment** omits `rift_binders` (CASCADE still handles it).

---

## What held up — do not “fix”

- **SQL model:** `rift_binders` RLS (`auth.uid() = user_id`), live-name unique, one live trade binder, owned/want partial uniques, wanted/`binder_id` check, backfill `system:trade` / `system:collection`, owned `binder_id`, `client_id` fill, Trade-only public share join. No FK (intentional for LWW). Tables stay `rift_*`. Prefs key `collection_entries` unchanged.
- **Per-binder free cap (mobile):** `_canAddNewCard` and `moveBinderCopies` count distinct printings **in the destination**. Qty-up and same printing in two binders behave as specified. Confirm Trade stays uncapped. `binders` cap is paywall, `binderCards` is refuse.
- **Confirm Trade / filler:** Given/received touch Trade Binder only; Collection tests pass. Filler boosts Trade / Want List, not Collection.
- **Lend:** No binder fields; isolation tests assert membership, overlay input, and lend qty unchanged.
- **Defaults:** `system:trade` / `system:collection` match SQL and both clients. `toJson`/`fromJson` remap missing owned `binder_id` to Trade; Want List stays null.
- **Sync plumbing:** New `SyncDomain.binders`, binders merged **before** entries, account discard clears binders without journaling deletes into the next account.
- **Contract tests:** Cover/names/move/value/free-limit goldens are real shared fixtures.
- **Cross-user writes:** Mutations stamp `user_id` from `getUser()`. Share is read-only via `get_rift_public_binder`. Token is 32 hex. Share button only on Trade Binder.
- **Secrets:** `apps/web/src/lib/supabase.js` defaults to fabloodle + publishable key (WEB-CONVENTIONS). No service-role key. No `tenrvaghaspwdvnwvgrh` default. Trade draft key is `rifttrades-trade-draft`.
- **Web stubs:** `cardStub` / `parseCardStub` match `CardModel.toStub()`.

---

## Tests to add or change

- Collection-sync: seed old journal key `binder|{cardId}` + new-ID remote row (offline qty, offline delete, fully synced then upgrade).
- Account switch → empty account → expect live Trade + Collection tiles (today’s test requires empty binders).
- Two conditions in one binder: stepper, chip, swipe, card-detail qty, confirm-trade decrement.
- First-run seed persist overlapping an in-flight sync that already pulled extra remote binders.
- Web: `wantListCards === 25`, `loanedCards === 25`.
- Web `confirmTrade` service test: received upserts use `binderId: 'system:trade'`; Collection row never upserted or removed.
- `CardDetailModal.test.jsx`: signed-in add with `setOpenBinderId('system:collection')` must upsert Collection, not Trade.
- `moveBinderCopies`: owned row with `binderId: null` and `fromBinderId: 'system:trade'` should succeed.

---

## Residual risk (even after the list)

- Unique live-name clashes across devices are not surfaced (`ARCHITECTURE.md` says surface them; `CollectionSync` will just fail that domain).
- No FK from entries to binders: a missing/tombstoned trade row empties the public share (INNER JOIN) even if the owner still sees cards.
- `get_rift_public_binder` has no mobile test.
- Web binder caps remain UI-only unless you add the entitlement re-read (same class as mobile).
- No `GRANT` on `rift_binders` (same as older `rift_*` files; confirm default privileges on fabloodle).
- One-way migration — no rollback without custom down SQL and possible data loss when collapsing multi-binder rows.
- `apps/web/dist` and `apps/web/public/price-guide/` CSVs were **not** reviewed.
- `.specify/` was **not** reviewed.

## Out of scope for the reviewer

Visual/canvas copy of this review: `/Users/joseescaler/.cursor/projects/Users-joseescaler-Documents-rifttrades/canvases/multi-binder-code-review.canvas.tsx` (IDE-only; do not treat as source of truth over this file).
