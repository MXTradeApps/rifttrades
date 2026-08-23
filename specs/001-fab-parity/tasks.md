---

description: "Task list for FAB Trades parity (minus life counter)"
---

# Tasks: FAB Trades Parity (Minus Life Counter)

**Input**: Design documents from `/specs/001-fab-parity/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. [plan.md](./plan.md) and constitution IV require byte-identical golden JSON in `apps/mobile/test/fixtures/` and `apps/web/tests/fixtures/`, asserted by both `flutter test --dart-define-from-file=env/production.json` and `npm test`. Widget/page tests for the grid, Want List sibling, move (including per-Binder cap refuse), value overlay, Trade Binder delete refusal, Pro upgrade on a 5th Binder, and Lend isolation. No `packages/contracts` package. Do not port a life counter.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Golden JSON (same bytes on both clients): `apps/mobile/test/fixtures/` and `apps/web/tests/fixtures/`
- Schema: `supabase/migrations/`
- Mobile: `apps/mobile/lib/features/binder/`, `apps/mobile/lib/core/models/`, `apps/mobile/lib/core/logic/`, `apps/mobile/lib/core/data/`, `apps/mobile/lib/core/sync/`
- Web: `apps/web/src/components/binder/`, `apps/web/src/utils/`, `apps/web/src/pages/BinderCollection.jsx`, `apps/web/src/services/binder.js`
- Tests: `apps/mobile/test/` and `apps/web/tests/`

## Constitution

Touches **I** (grid + two defaults + move + overlay + limits; no folders / share-all-Binders / Collection-in-Confirm-Trade / life counter), **II** (`role=trade` vs display name; Want List is `isWanted`; cover/value derived; Lend is a separate type), **III** (duplicate name refused; Trade Binder delete refused; non-empty delete refused; per-Binder cap refuse; unpriced tile/overlay is unpriced, not $0), **IV** (byte-identical fixtures; both suites assert them; no `packages/contracts` package), **V** (pipeline unchanged). **MINOR 1.0.0 → 1.1.0** in this change: Collection as a default Binder **name** (Constraint 4 + `context.md`); web lives in `apps/web` here (Constraint 3 + Engineering Practice + `docs/port/WEB-CONVENTIONS.md`). Also: table is the deadline (Confirm Trade / filler stay Trade Binder), no gate before value (signed-out mobile), real prices or nothing, local reads, dual-client DRY (fixtures not a runtime), server-owned Pro (5th Binder paywall does not write `rift_entitlements`).

Copy FAB Trades helpers (`binder_move`, `binder_cover`, `binder_names`, `binder_value_snapshot`, grid/overlay chrome) and **adapt**: `rift_*` tables, **per-Binder** `binderCards` (refuse move-in of a new Printing at 50), **no Lend in totals or overlay**, Riftbound Normal/Foil. Do **not** copy FAB’s shared 50-across-all-Binders cap.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Golden cases so JS and Dart cannot invent different Binder, cover, move, name, overlay-math, or free-limit rules. Each fixture task writes **identical bytes** to both client trees.

- [X] T001 [P] Create byte-identical `apps/mobile/test/fixtures/free_limits_binders.json` and `apps/web/tests/fixtures/free_limits_binders.json` from [contracts/free-limits.md](./contracts/free-limits.md): `limits.binderCards: 50` counted **per Binder** (`refuse`); `limits.binders: 4` (`behaviour.binders: "paywall"`); cases: 50 distinct in Collection refuses a **new** Printing move-in from Trade Binder; quantity-up of a Printing already in Collection allowed; same Printing in two Binders counts as 1 in each; 3 live Binders create allowed; 4 live Binders create forbidden for free / allowed for Pro; tombstoned Collection does not count toward 4; do not change `wantListCards`
- [X] T002 [P] Create byte-identical `apps/mobile/test/fixtures/binder_move.json` and `apps/web/tests/fixtures/binder_move.json` from [contracts/binder-move.md](./contracts/binder-move.md) using catalog-shaped rows: partial qty, merge on printing+condition, refuse qty &lt; 1 / qty &gt; source / same Binder / missing source / tombstoned destination / Want List destination, refuse new Printing into a free Binder already at 50, allow quantity-only merge at 50
- [X] T003 [P] Create byte-identical `apps/mobile/test/fixtures/binder_cover.json` and `apps/web/tests/fixtures/binder_cover.json` from [contracts/binders.md](./contracts/binders.md): empty → no cover; highest `qty × sourceValue` (`pricingValue` vs `tcgMarketOnly`); ties name A–Z then printing id then condition; all-unpriced still picks a cover by name (must not look empty)
- [X] T004 [P] Create byte-identical `apps/mobile/test/fixtures/binder_names.json` and `apps/web/tests/fixtures/binder_names.json` from [contracts/binders.md](./contracts/binders.md): trim + case-fold uniqueness among live Binders; empty-after-trim invalid; own-name rename ok; deleted name reusable; Trade Binder rename keeps `role=trade`
- [X] T005 [P] Create byte-identical `apps/mobile/test/fixtures/binder_value_snapshot.json` and `apps/web/tests/fixtures/binder_value_snapshot.json` from [contracts/binder-value-snapshot.md](./contracts/binder-value-snapshot.md): quantity weighting, foil CardMarket, null/`0` omitted, all-unpriced `amount` null, `tcgUnpricedCopies` / `cmUnpricedCopies`, top-five cap, contribution/name/id ties, `headline: "pricingValue"` and `headline: "tcgMarketOnly"` case groups, `tolerance` `1e-9`; input is one Binder’s owned rows only (no Want List, no Lend)
- [X] T006 Add `loadContract` reading `test/fixtures/<name>.json` (cwd = `apps/mobile`) in `apps/mobile/test/contracts/contract_fixtures.dart`; web contract tests will `import` from `apps/web/tests/fixtures/` (Jest already allows `json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, Binder records, entry identity, seed/migration, sync, per-Binder free limits, cover helper, and Trade Binder scoping. Grid stories only display these objects.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 MINOR-amend `.specify/memory/constitution.md` (version **1.0.0 → 1.1.0**, Sync Impact Report, LAST_AMENDED_DATE 2026-08-22): Constraint 4 — product noun remains Binder; Trade Binder = tradeable stock; Collection is allowed as the default keep-pile Binder **name**; do not rename the Binder destination to Collection; Want List is still not a Binder. Constraint 3 + Engineering Practice — Flutter and web are peer clients **in this repo**; web product UI lives at `apps/web/`; do not send web work to a second product repo
- [X] T008 [P] Update Binder / Collection / Want List / Lend vocabulary in `context.md` to match T007 (Trade Binder = tradeable stock; Collection = owned-not-for-trade default Binder name; type stays Binder; Lend does not interact with Binders)
- [X] T009 [P] Document the `binders` domain and owned entry identity `binder|{binderId}|{cardId}|{condition}` vs `want|{cardId}` in `docs/ARCHITECTURE.md` (Cloud sync; last-write-wins per record; unique live names; unique-violation is a surfaced error; Lend domain unchanged)
- [X] T010 [P] Update `docs/port/WEB-CONVENTIONS.md` so the web client is `apps/web` in this repo (not `/Users/joseescaler/Documents/riftrades`); `/binder` is grid-first; table `rift_binders`; owned entries carry `binder_id`
- [X] T011 Add `supabase/migrations/20260822200000_rift_multi_binders.sql`: `public.rift_binders` (`user_id`, `client_id`, `name`, `role` trade|standard, timestamps, `deleted_at`; `UNIQUE (user_id, client_id)`; partial unique live names `UNIQUE (user_id, lower(btrim(name))) WHERE deleted_at IS NULL`; partial unique one trade Binder; RLS own rows); `rift_binder_entries.binder_id TEXT`; drop `UNIQUE (user_id, card_id, is_wanted)`; partial unique owned `(user_id, card_id, binder_id, condition) WHERE is_wanted = false AND deleted_at IS NULL`; partial unique want `(user_id, card_id) WHERE is_wanted = true AND deleted_at IS NULL`; check `(is_wanted AND binder_id IS NULL) OR (NOT is_wanted AND binder_id IS NOT NULL)`; backfill `system:trade` + `system:collection` and set owned `binder_id = system:trade`; rewrite `private.get_rift_public_binder_by_token` to join `rift_binders` and return owned live rows whose Binder `role = trade` only; no FK from `binder_id` to `rift_binders`
- [X] T012 [P] Create Binder record (`clientId`, `name`, `role` trade|standard, `createdAt`, `updatedAt`, `deletedAt`; defaults `system:trade` / `system:collection`) in `apps/mobile/lib/core/models/binder.dart`
- [X] T013 [P] Add `binderId` on owned rows (null when `isWanted`; default `system:trade` on owned JSON missing `binder_id`) in `apps/mobile/lib/core/models/binder_entry.dart` (`copyWith` / `toJson` / `fromJson`) and round-trip it in `apps/mobile/test/core/models/binder_entry_test.dart`
- [X] T014 Create `apps/mobile/lib/core/data/binders_repository.dart` (`CachedCollection<Binder>`, storage key `binders`): seed Trade Binder + Collection when missing; never tombstone `role=trade`
- [X] T015 On load, assign owned entries missing `binderId` to `system:trade` (Want List stays null) in `apps/mobile/lib/core/data/binder_repository.dart` so pre-feature `collection_entries` migrate losslessly (do not rename the storage key)
- [X] T016 [P] Implement binders-table adapter (`client_id` identity, tombstones, conflict `user_id,client_id`, table `rift_binders`) in `apps/mobile/lib/core/sync/binders_sync.dart`
- [X] T017 Change owned `idOf` to `binder|{binderId}|{cardId}|{condition}` and want to `want|{cardId}` (conflict target matches new uniques; include `binder_id` in `toRow`) in `apps/mobile/lib/core/sync/binder_sync.dart`; add `SyncDomain.binders` in `apps/mobile/lib/core/sync/sync_journal.dart`; wire the binders collection in `apps/mobile/lib/core/sync/sync_service.dart` (leave `lend_sync.dart` unchanged)
- [X] T018 Add `bindersRepositoryProvider` + `BindersNotifier` (load/seed, live list, grid order: trade, live Collection, then `createdAt`) and keep `BinderNotifier` loading entries in `apps/mobile/lib/core/providers.dart`
- [X] T019 Fetch/upsert/seed `rift_binders` and scope `rift_binder_entries` by `binder_id` (Want List `binder_id` null) in `apps/web/src/services/binder.js` without inventing signed-out web Binder storage
- [X] T020 [P] Write failing contract tests for `free_limits_binders.json` (**per-Binder** `binderCards`, `binders: 4` paywall) via `apps/mobile/test/contracts/contract_fixtures.dart` in `apps/mobile/test/contracts/free_limits_contract_test.dart` and extend per-Binder cases in `apps/mobile/test/core/providers/free_limits_test.dart`
- [X] T021 [P] Write failing contract tests that import `apps/web/tests/fixtures/free_limits_binders.json` in `apps/web/tests/contracts/freeLimits.contract.test.js` (keep existing `apps/web/tests/utils/freeLimits.test.js` want/loaned numbers unchanged)
- [X] T022 Implement `FreeLimits.binders = 4`, `canCreateBinder`, and `binderCards` counted **per Binder** (`canAddDistinctCard` / `_canAddNewCard` take that Binder’s distinct count) in `apps/mobile/lib/core/logic/free_limits.dart` until T020 passes — Pro removes Binder caps; clients MUST NOT write entitlements; do not “fix” `wantListCards: 25`
- [X] T023 [P] Implement the same `FreeLimits.binders`, per-Binder `binderCards`, and `canCreateBinder` in `apps/web/src/utils/freeLimits.js` until T021 passes — do not change `wantListCards: 50` or `loanedCards: 1`
- [X] T024 [P] Write failing contract tests that load `binder_cover.json` via `apps/mobile/test/contracts/contract_fixtures.dart` in `apps/mobile/test/contracts/binder_cover_contract_test.dart` using catalog-shaped rows
- [X] T025 [P] Write failing contract tests that import `apps/web/tests/fixtures/binder_cover.json` in `apps/web/tests/contracts/binderCover.contract.test.js`
- [X] T026 Implement cover pick (empty none; max contribution; all-unpriced name-stable) in `apps/mobile/lib/core/logic/binder_cover.dart` until T024 passes — same `pricingValue` / `tcgMarketOnly` split as [contracts/binders.md](./contracts/binders.md)
- [X] T027 [P] Implement the same cover pick in `apps/web/src/utils/binderCover.js` until T025 passes (web default `tcgMarketOnly`)
- [X] T028 Scope `reconcileBinderAfterTrade` to entries whose Binder `role = trade` (given leave Trade Binder; received enter Trade Binder; other Binders untouched; Want List decrement unchanged; do not read Lend) in `apps/mobile/lib/core/logic/confirm_trade.dart` until `apps/mobile/test/core/logic/confirm_trade_test.dart` passes
- [X] T029 [P] Scope `reconcileBinderAfterTrade` the same way in `apps/web/src/utils/confirmTrade.js` until `apps/web/tests/utils/confirmTrade.test.js` and `apps/web/tests/services/confirmTrade.test.js` pass
- [X] T030 [P] Boost Trade Filler from Trade Binder only (`role = trade`, not Collection) in `apps/mobile/lib/core/logic/trade_filler.dart` until `apps/mobile/test/core/logic/trade_filler_test.dart` passes; assert `getPublicBinder` / RPC fixtures in `apps/web/tests/services/binder.test.js` return Trade Binder rows only (not Collection)

**Checkpoint**: Foundation ready — `flutter test --dart-define-from-file=env/production.json` and `npm test` pass new/extended fixtures; schema and seed exist; Confirm Trade / share / filler cannot steal Collection; Lend sync untouched; no grid UI yet

---

## Phase 3: User Story 1 - See my Binders as a grid (Priority: P1) 🎯 MVP

**Goal**: The Binder destination opens on a grid of Binders (Trade Binder + Collection). Tiles show name, copy count, value, and cover; drill-in opens that Binder’s list; back returns to the grid; existing owned cards migrate to Trade Binder; signed-out mobile works

**Independent Test**: New player (empty) and existing Binder cards. Grid shows Trade Binder and Collection with name, count, value. Non-empty Trade Binder shows highest-value cover; empty Collection shows no cover. Open Trade Binder, back to grid. Pre-feature owned cards are in Trade Binder, not Collection. Signed-out mobile: grid and lists without creating an account. Web signed-in `/binder` matches; do not invent signed-out web Binder.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T031 [P] [US1] Widget tests in `apps/mobile/test/widgets/binder_grid_test.dart`: two default tiles; name / copy count / value match the list; empty tile has 0, true-zero value, no cover; unpriced non-empty shows `—` not `$0.00`/`€0.00` and still a cover; tile opens that Binder’s list; back returns to the grid; existing owned cards appear in Trade Binder; signed-out (no account) still shows the grid
- [X] T032 [P] [US1] Page/component tests in `apps/web/tests/components/BinderGrid.test.jsx`: signed-in `/binder` shows the same two tiles and drill-in/back; `isWanted` / `/wants` is not this grid; do not render a local grid when signed out

### Implementation for User Story 1

- [X] T033 [P] [US1] Implement the Binder grid (tiles: name, copy count, tile value from that Binder’s existing total helper, cover from `binder_cover.dart` / catalog `image_url`; grid order from [contracts/binders.md](./contracts/binders.md); local data only; Lend is not an input) in `apps/mobile/lib/features/binder/binder_grid.dart`
- [X] T034 [P] [US1] Implement the same tile contract in `apps/web/src/components/binder/BinderGrid.jsx` (web value = TCG Market total for that Binder’s rows)
- [X] T035 [US1] Extract the existing Binder list chrome (sort, qty, green total) into `apps/mobile/lib/features/binder/binder_list.dart` scoped to one `binderId` (leave `_BinderValueChip` non-tappable until US4)
- [X] T036 [US1] Make the Binder tab home the grid; tile pushes `binder_list.dart`; back returns to the grid (Want List tab index unchanged); no account gate in `apps/mobile/lib/features/binder/binder_screen.dart`
- [X] T037 [US1] Make `/binder` (`isWanted === false`) grid-first with drill-in to the current list chrome and back to the grid in `apps/web/src/pages/BinderCollection.jsx` (do not change signed-out `/binder` into an on-device Binder; do not turn `/wants` into a Binder grid)
- [X] T038 [US1] Pass `binderId` into add: open Binder if one is drilled in, else Trade Binder (`system:trade`) from `apps/mobile/lib/app/card_actions.dart`, `apps/mobile/lib/features/card_detail/card_detail_screen.dart`, `apps/mobile/lib/features/scan/scan_screen.dart`, and `apps/mobile/lib/features/paywall/pro_limits.dart` (`addToBinderOrUpsell`); Want List adds still set `isWanted`
- [X] T039 [US1] Same add-target rule (open Binder vs Trade Binder from the grid) in `apps/web/src/components/cardDetail/CardDetailModal.jsx` and `apps/web/src/pages/BinderCollection.jsx`
- [X] T040 [US1] Scope `BinderNotifier.add` / qty / condition / identity to `(printing, binderId, condition)` and count free `binderCards` **per Binder** in `apps/mobile/lib/core/providers.dart`
- [X] T041 [US1] Scope `upsertEntry` the same way (owned unique includes `binder_id` + condition; distinct owned count **per Binder**) in `apps/web/src/services/binder.js`

**Checkpoint**: User Story 1 is fully functional and testable independently (grid + two defaults + drill-in + migration). Want List still uses today’s entry; create/move/overlay not required yet

---

## Phase 4: User Story 2 - Reach Want List without losing it (Priority: P1)

**Goal**: Want List stays a sibling of the Binder grid — one obvious step, not a Binder tile, and never mixed into tile counts or values

**Independent Test**: From the Binder grid, open Want List without opening a Binder. Confirm it is the existing Want List (not a Binder named Want List). Return to the grid. Want List cards do not change any Binder tile’s count or value.

### Tests for User Story 2 ⚠️

- [X] T042 [P] [US2] Extend `apps/mobile/test/widgets/binder_grid_test.dart`: Binder | Want List tabs still present; Want List is not a grid tile; Want List rows do not affect Trade Binder / Collection count or value; returning from Want List shows the grid (or the Want List tab), not a blank Binder
- [X] T043 [P] [US2] Extend `apps/web/tests/components/BinderGrid.test.jsx` and `apps/web/tests/components/Header.test.jsx`: `/wants` is unchanged list chrome; `/binder` grid has no Want List tile; Header still links Want List in one step

### Implementation for User Story 2

- [X] T044 [US2] Keep the Want List tab as index 1 (sibling, not a tile) and keep `apps/mobile/lib/features/want_list/want_list_screen.dart` wired from `apps/mobile/lib/features/binder/binder_screen.dart`
- [X] T045 [P] [US2] Keep `/wants` and the Want List nav item in `apps/web/src/App.jsx` and `apps/web/src/components/elements/Header.jsx` (Binder dest = `/binder` grid; Want List remains a sibling route)
- [X] T046 [US2] Leave the `isWanted === true` path as the existing Want List (no Binder tiles, no move-into-Want-List) in `apps/web/src/pages/BinderCollection.jsx`

**Checkpoint**: User Stories 1 and 2 both work; Want List is reachable in one step and is not a Binder

---

## Phase 5: User Story 3 - Move cards between Binders (Priority: P2)

**Goal**: From an open Binder list, move some or all copies of a Printing into another live Binder. Source decreases, destination merges on printing+condition, tiles update. Want List is not a destination. A move that would add a **new** Printing to a free Binder already at 50 is refused; quantity-only merge succeeds.

**Independent Test**: Qty 3 in Trade Binder; move 2 to Collection → Trade Binder 1, Collection 2; counts and values match. Destination already having that Printing+condition merges. Fill Collection to 50 distinct; move a new Printing in is refused; qty-up of an existing Collection Printing succeeds. Want List is not offered as a destination.

### Tests for User Story 3 ⚠️

- [X] T047 [P] [US3] Write failing contract tests that load `binder_move.json` via `apps/mobile/test/contracts/contract_fixtures.dart` in `apps/mobile/test/contracts/binder_move_contract_test.dart` using catalog-shaped rows
- [X] T048 [P] [US3] Write failing contract tests that import `apps/web/tests/fixtures/binder_move.json` in `apps/web/tests/contracts/binderMove.contract.test.js`
- [X] T049 [P] [US3] Widget tests in `apps/mobile/test/widgets/binder_list_test.dart`: move 2 of 3 Trade Binder → Collection; merge on same printing+condition; Want List absent from destinations; tiles update count/value/cover; new Printing into a Binder at 50 is refused
- [X] T050 [P] [US3] Page/component tests with the same move assertions in `apps/web/tests/components/BinderGrid.test.jsx`

### Implementation for User Story 3

- [X] T051 [US3] Implement `moveBinderCopies` (partial qty, merge printing+condition, refuse invalid qty / same Binder / non-live dest / Want List; **refuse** new Printing when free destination is at `binderCards`) in `apps/mobile/lib/core/logic/binder_move.dart` until T047 passes — do not copy FAB’s “never refuse move for binderCards”
- [X] T052 [P] [US3] Implement the same helper in `apps/web/src/utils/binderMove.js` until T048 passes
- [X] T053 [US3] Apply moves through `BinderNotifier` (source qty / delete at 0; dest upsert) in `apps/mobile/lib/core/providers.dart`
- [X] T054 [P] [US3] Apply moves (update/delete source + upsert dest; conflict on new owned unique) in `apps/web/src/services/binder.js`
- [X] T055 [US3] Add Move on an open owned Binder row (destination = other live Binders; qty 1…n; surface cap refuse) in `apps/mobile/lib/features/binder/binder_list.dart`
- [X] T056 [US3] Add the same Move control in `apps/web/src/pages/BinderCollection.jsx` (hidden on `/wants`)

**Checkpoint**: User Stories 1–3 work; Collection exists as a keep pile because stock can change Binders; per-Binder cap is honest

---

## Phase 6: User Story 4 - Open Binder value from the green total (Priority: P2)

**Goal**: Activating the open Binder’s green / header total opens one overlay with matching headline, TCG Market/Low, CardMarket Trend/Low, stock counts, and up to five Top Printings. Dismiss restores the list. Empty Binder, Want List, and the grid have no control. Overlay does not read Lend.

**Independent Test**: Non-empty Binder → activate the green chip (mobile) or `/binder` header total (web) → overlay appears, headline matches the control, four marketplace totals omit unpriced copies (`—`, never `$0.00`/`€0.00`), counts and top five match the list, dismiss leaves list/tab/qty unchanged. Empty Binder / Want List / grid: no this overlay. Signed-out mobile still inspects.

### Tests for User Story 4 ⚠️

- [X] T057 [P] [US4] Write failing contract tests that load `binder_value_snapshot.json` via `apps/mobile/test/contracts/contract_fixtures.dart` in `apps/mobile/test/contracts/binder_value_snapshot_contract_test.dart`
- [X] T058 [P] [US4] Write failing contract tests that import `apps/web/tests/fixtures/binder_value_snapshot.json` in `apps/web/tests/contracts/binderValueSnapshot.contract.test.js`
- [X] T059 [P] [US4] Widget tests in `apps/mobile/test/widgets/binder_value_sheet_test.dart`: non-empty open Binder chip opens one sheet; headline matches the chip; TCG Market/Low and CardMarket Trend/Low render; unpriced field shows `—` not `$0.00`/`€0.00`; stock + top five (≤ 5, no pad); dismiss leaves entries; empty Binder / Want List / grid hide the chip; Lend groups do not change overlay totals
- [X] T060 [P] [US4] Component tests in `apps/web/tests/components/BinderValueDialog.test.jsx`: `/binder` drill-in total opens one dialog; headline matches the header total; same marketplace / unpriced / stock / top-five assertions; dismiss (close/backdrop/Escape) leaves entries; `isWanted` / `/wants` / grid-only view is not this control

### Implementation for User Story 4

- [X] T061 [US4] Implement `buildBinderValueSnapshot` (Binder rows only, qty &lt; 1 dropped, foil-aware CM Trend/Low, `MoneyTotal.amount` null when `pricedCopies === 0`, `sourceValue` per `headline` mode, **no Lend input**) in `apps/mobile/lib/core/logic/binder_value_snapshot.dart` until T057 passes — map from `BinderEntry` + `CardModel` + `PriceSource`
- [X] T062 [P] [US4] Implement `buildBinderValueSnapshot` with the same rules in `apps/web/src/utils/binderValueSnapshot.js` until T058 passes — map from `/binder` entries + live catalog fields; default `headline: "tcgMarketOnly"`
- [X] T063 [P] [US4] Implement scrollable `showModalBottomSheet` chrome in `apps/mobile/lib/features/binder/binder_value_sheet.dart` per [contracts/binder-value-overlay.md](./contracts/binder-value-overlay.md): title **Binder value**, headline + Settings source label, TCG/CM rows, Stock, Top Printings; close/drag dismiss; no Binder mutations; no network fetch
- [X] T064 [P] [US4] Implement MUI `Dialog` chrome in `apps/web/src/components/binder/BinderValueDialog.jsx` with the same contents (TCGplayer source label; `headline: "tcgMarketOnly"`; format USD/EUR like `apps/web/src/components/cardDetail/CardDetailPrices.jsx`)
- [X] T065 [US4] Make `_BinderValueChip` a button and open `binder_value_sheet.dart` from `apps/mobile/lib/features/binder/binder_list.dart` (open owned Binder only, non-empty; pass the same formatted total already shown; do not change the chip formula; do not offer the overlay on the grid)
- [X] T066 [US4] Make the `/binder` drill-in header total a button and open `BinderValueDialog.jsx` only when `isWanted === false` and a Binder list is open in `apps/web/src/pages/BinderCollection.jsx` (do not wire `/wants` or the grid-only view; do not change `totalValue` math; do not touch `apps/web/src/pages/SharedBinder.jsx`)

**Checkpoint**: User Stories 1–4 work; green total is inspectable on both surfaces; Want List and grid do not open the overlay

---

## Phase 7: User Story 5 - Add, rename, and delete Binders (Priority: P3)

**Goal**: Create unique-named Binders up to 4 on free (5th shows Pro upgrade, creates nothing). Rename any Binder including Trade Binder (`role` stays `trade`). Delete Collection and user Binders only when empty. Trade Binder is never deletable.

**Independent Test**: Create “Side Event”, rename, delete while empty. Delete Trade Binder is refused and it stays on the grid. Free player with 4 Binders: 5th create shows Pro upgrade and still has exactly 4. Duplicate names (including `collection` vs `Collection`) refused.

### Tests for User Story 5 ⚠️

- [X] T067 [P] [US5] Write failing contract tests that load `binder_names.json` via `apps/mobile/test/contracts/contract_fixtures.dart` in `apps/mobile/test/contracts/binder_names_contract_test.dart`
- [X] T068 [P] [US5] Write failing contract tests that import `apps/web/tests/fixtures/binder_names.json` in `apps/web/tests/contracts/binderNames.contract.test.js`
- [X] T069 [P] [US5] Widget tests in `apps/mobile/test/widgets/binder_grid_test.dart`: unique create; rename collision refused; Trade Binder delete hidden or refused (empty or not); non-empty Collection delete refused; empty delete leaves the grid; 5th create on free calls `presentProPaywall` and does not add a Binder
- [X] T070 [P] [US5] Page/component tests with the same create/rename/delete/Pro assertions in `apps/web/tests/components/BinderGrid.test.jsx`

### Implementation for User Story 5

- [X] T071 [US5] Implement name normalize/uniqueness (trim + case-fold; own-name ok; empty invalid) in `apps/mobile/lib/core/logic/binder_names.dart` until T067 passes
- [X] T072 [P] [US5] Implement the same rules in `apps/web/src/utils/binderNames.js` until T068 passes
- [X] T073 [US5] Implement create / rename / delete on `BindersNotifier` in `apps/mobile/lib/core/providers.dart`: `canCreateBinder` for free; refuse `role=trade` delete; refuse delete when any live owned entry has `quantity ≥ 1`; tombstone otherwise; unique live names
- [X] T074 [P] [US5] Implement create / rename / delete Binders (same refusals; `behaviour.binders = "paywall"` creates no 5th row) in `apps/web/src/services/binder.js`
- [X] T075 [US5] Add create / rename / delete chrome on the grid; hide or no-op delete on Trade Binder; surface duplicate-name and non-empty-delete errors in `apps/mobile/lib/features/binder/binder_grid.dart` and `apps/mobile/lib/features/binder/binder_screen.dart`
- [X] T076 [US5] Add the same chrome in `apps/web/src/components/binder/BinderGrid.jsx` and `apps/web/src/pages/BinderCollection.jsx`
- [X] T077 [US5] On a free 5th create, call `presentProPaywall` from `apps/mobile/lib/features/binder/binder_screen.dart` using `apps/mobile/lib/features/paywall/pro_paywall.dart` (do not write entitlements); after Pro, retry create
- [X] T078 [US5] On a free 5th create, show the existing web Pro CTA (subscribe-in-app copy; no 5th row; do not write `rift_entitlements`) in `apps/web/src/pages/BinderCollection.jsx`

**Checkpoint**: All five stories independently functional; Trade Binder cannot be deleted; names unique and syncable; 5th Binder is Pro

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Vocabulary, share surface, Lend isolation, no life counter, fixture identity, and quickstart validation

- [X] T079 [P] Update Binder tour copy so the grid, Trade Binder vs Collection, and tapping the green total are mentioned, and Want List / Lend are not taught as Binders, in `apps/mobile/lib/features/onboarding/tour_copy.dart` (`binderTabsBody` / `binderTotalBody` / related strings)
- [X] T080 Confirm labels use Binder / Trade Binder / Collection (name) / Printing / Want List / TCGplayer / CardMarket / Market / Low / Trend (not “inventory”, not Want List as a Binder) in `apps/mobile/lib/features/binder/binder_grid.dart`, `apps/mobile/lib/features/binder/binder_list.dart`, `apps/mobile/lib/features/binder/binder_value_sheet.dart`, `apps/web/src/components/binder/BinderGrid.jsx`, `apps/web/src/components/binder/BinderValueDialog.jsx`, and `apps/web/src/pages/BinderCollection.jsx`
- [X] T081 [P] Keep public `/b/:token` as Trade Binder only (no Collection leak) in `apps/web/src/pages/SharedBinder.jsx` and `apps/web/src/services/binder.js` (`getPublicBinder`)
- [X] T082 [P] Add Lend isolation coverage in `apps/mobile/test/core/providers/free_limits_test.dart` (or a dedicated `apps/mobile/test/core/providers/lend_binder_isolation_test.dart`): lend-group mutations do not change Binder membership, tile counts, or overlay snapshot input; Binder move/add does not change `lendProvider`; do not edit `apps/mobile/lib/core/sync/lend_sync.dart` or `apps/mobile/lib/features/lend/`
- [X] T083 Keep distinct-card overflow on the existing refuse + Upgrade snackbar path (not a mandatory paywall modal) in `apps/mobile/lib/features/paywall/pro_limits.dart` and the `/binder` card-cap Alert in `apps/web/src/pages/BinderCollection.jsx`; `paywall` is only for `binders`
- [X] T084 [P] Add `apps/web/` to the repo layout table in `README.md` (peer Flutter + web clients in this repo)
- [X] T085 Confirm the five fixture pairs are byte-identical (`cmp apps/mobile/test/fixtures/free_limits_binders.json apps/web/tests/fixtures/free_limits_binders.json` and the same for `binder_move.json`, `binder_cover.json`, `binder_names.json`, `binder_value_snapshot.json`)
- [X] T086 Run `cd apps/mobile && flutter test --dart-define-from-file=env/production.json` and `cd apps/web && npm test`, then walk [quickstart.md](./quickstart.md) on **both** surfaces (grid + defaults + migration, Want List sibling, move 3→2+1 and cap refuse, value overlay, unique names, Trade Binder delete refusal, 5th Binder Pro upgrade, Confirm Trade / share / filler Trade Binder only, Lend isolation, signed-out mobile, no life counter, constitution + `context.md` vocabulary in this change). Missing either surface means the feature is not Done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational
  - US2 assumes the US1 grid exists (Want List is a sibling of that grid)
  - US3 assumes US1 drill-in list exists (move lives on an open Binder)
  - US4 assumes US1 drill-in list exists (overlay opens from that Binder’s total)
  - US5 assumes the US1 grid exists (create/rename/delete are grid actions)
  - US3, US4, and US5 can proceed in parallel after US1 if staffed — coordinate files `binder_list.dart` / `BinderCollection.jsx` / `providers.dart` / `binder.js`
- **Polish (Phase 8)**: After desired stories are complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — MVP grid + two defaults + drill-in + migration
- **User Story 2 (P1)**: After US1 grid exists — Want List sibling; independently testable as “Want List still works”
- **User Story 3 (P2)**: After US1 list drill-in — move; helpers are new files and can start while US2 UI is in progress
- **User Story 4 (P2)**: After US1 list drill-in — overlay; snapshot helpers are new files
- **User Story 5 (P3)**: After US1 grid — create/rename/delete + Pro on 5th; names helpers are new files

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Schema + Binder records + entry `binderId` (Phase 2) before any grid
- Cover helper (Phase 2) before tile images
- Move/name/snapshot helpers before their UI
- Story complete before the next priority if one person is editing `binder_screen.dart` / `BinderCollection.jsx`

### Parallel Opportunities

- T001–T005 in parallel after planning cases
- T008, T009, T010 in parallel after (or beside) T007 if they do not rewrite the same constitution sentences
- T012 and T013 in parallel after T011 (or alongside if the SQL shape is already specified)
- T020 and T021 in parallel; T022 and T023 after their failing tests
- T024 and T025 in parallel; T026 and T027 after their failing tests
- T028, T029, T030 in parallel (mobile confirm / web confirm / filler+share)
- T031 and T032 in parallel; T033 and T034 in parallel
- T042 and T043 in parallel
- T047 and T048 in parallel; T051 and T052 after those tests
- T049 and T050 in parallel; T055 and T056 in parallel (mobile vs web)
- T057 and T058 in parallel; T061 and T062 after those tests
- T059 and T060 in parallel; T063 and T064 in parallel
- T067 and T068 in parallel; T071 and T072 after those tests
- T069 and T070 in parallel; T075 and T076 in parallel
- T079, T081, T082, T084 can run beside T080

---

## Parallel Example: User Story 1

```bash
# Tests together:
Task: "Widget tests in apps/mobile/test/widgets/binder_grid_test.dart"
Task: "Component tests in apps/web/tests/components/BinderGrid.test.jsx"

# Grid chrome together:
Task: "Grid in apps/mobile/lib/features/binder/binder_grid.dart"
Task: "Grid in apps/web/src/components/binder/BinderGrid.jsx"
```

## Parallel Example: User Story 3

```bash
# After US1, move contract tests then helpers (mobile vs web in parallel):
Task: "binder_move.dart until apps/mobile/test/contracts/binder_move_contract_test.dart passes"
Task: "binderMove.js until apps/web/tests/contracts/binderMove.contract.test.js passes"
```

## Parallel Example: User Story 4

```bash
# Snapshot helpers together, then overlay chrome:
Task: "binder_value_snapshot.dart in apps/mobile/lib/core/logic/binder_value_snapshot.dart"
Task: "binderValueSnapshot.js in apps/web/src/utils/binderValueSnapshot.js"
```

## Parallel Example: User Story 5

```bash
# Names helpers together, then grid manage chrome:
Task: "binder_names.dart in apps/mobile/lib/core/logic/binder_names.dart"
Task: "binderNames.js in apps/web/src/utils/binderNames.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (byte-identical fixtures + loader)
2. Complete Phase 2: Foundational (schema, seed/migrate, sync, cover, per-Binder free-limit helpers, Trade Binder scoping, constitution/docs)
3. Complete Phase 3: User Story 1 (grid of Trade Binder + Collection, drill-in, migration)
4. **STOP and VALIDATE**: Open Binder destination, see two tiles, open Trade Binder, back to grid; existing cards in Trade Binder
5. Demo if ready; Want List (US2) is the next P1 so it should follow before calling the Binder area done for players who use Want List today. Feature Done still requires US3–US5 **and both surfaces** (FR-023 / SC-019)

### Incremental Delivery

1. Setup + Foundational → shared records, fixtures, Trade Binder safety
2. US1 → grid is the Binder home (MVP)
3. US2 → Want List still one step away
4. US3 → move between Binders (per-Binder cap refuse)
5. US4 → value overlay from the green total
6. US5 → extra Binders, unique names, non-deletable Trade Binder, Pro on 5th
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With two developers after Foundational:

1. Developer A: mobile grid → Want List tab → move → overlay → manage (US1 → US5)
2. Developer B: web `/binder` grid → `/wants` sibling → move → overlay → manage
3. Integrate at `providers.dart` / `apps/web/src/services/binder.js` and the duplicated fixtures (`cmp` in T085)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story
- Do not treat Want List as a Binder, invent signed-out web Binder, share Collection, auto-move Collection on Confirm Trade, couple Lend to Binders, write entitlements from the client, invent prices, or port a life counter
- Distinct-card cap is **per Binder**; do not copy FAB’s shared pool
- Tile value reuses that Binder’s existing total; cover ranking uses the same source
- Overlay math is a pure snapshot of the **open** Binder; web header may stay TCG-Market-only
- Golden JSON is data-loss-sensitive — fix the implementation that drifted, not the fixture, unless the product decision changed
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
