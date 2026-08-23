# Implementation Plan: FAB Trades Parity (Minus Life Counter)

**Branch**: `001-fab-parity` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fab-parity/spec.md`

## Summary

Close the remaining player-facing gap vs FAB Trades: the Binder destination becomes a **grid of Binders** with **Trade Binder** (tradeable stock, never deletable) and **Collection** (keep pile), plus **move**, **create/rename/delete**, and a **Binder-value overlay** from the green total. Want List stays a sibling. Lend does not interact with Binders. Life counter is not ported.

Free: **50 distinct Printings per Binder** (not a shared pool); **4 Binders**; a 5th create shows the **Pro upgrade**. Adds from Browse / card details / Scan go to Trade Binder unless a Binder list is open. Done only when **mobile and web** both have grid, move, extra Binders, and the overlay.

Schema: new `rift_binders`; `binder_id` + condition on owned `rift_binder_entries`. Matching Dart/JS assertions (no `packages/contracts` package). Constitution MINOR: Collection as Binder name, and web lives in `apps/web` in this repo. `context.md` updated in the same change.

## Technical Context

**Language/Version**: Dart SDK ^3.12 (Flutter, `apps/mobile`) and JavaScript ES modules + React 19 (`apps/web`); Postgres via Supabase migrations

**Primary Dependencies**: Existing Flutter Binder tab + MUI Binder page. Existing `Pricing` / catalog images. Existing Pro upgrade. Sync adapters (`BinderSyncAdapter` + a new binders adapter). Copy FAB Trades helpers (`binder_move`, `binder_cover`, `binder_names`, `binder_value_snapshot`) and adapt to `rift_*` tables. No new pricing library. No life-tracker code.

**Storage**: Mobile SharedPreferences (`collection_entries` plus a binders list). Postgres `rift_binders` (new) and `rift_binder_entries` (altered). Device storage remains the read source; sync is background last-write-wins per record.

**Testing**: `cd apps/mobile && flutter test --dart-define-from-file=env/production.json`; `cd apps/web && npm test`. Byte-identical golden JSON in both test trees for limits, move, cover, names, and value snapshot. Widget/page tests for grid, Want List sibling, Trade Binder delete refusal, Pro upgrade on 5th Binder, overlay open/dismiss, Lend isolation.

**Target Platform**: RiftTrades mobile (iOS/Android) Binder tab and web `/binder` in this repo (`apps/web`). Want List (`/wants`, mobile tab) and public share stay; share content is Trade Binder only.

**Project Type**: Dual-client product feature in one repo. Shared *fixtures and vocabulary*, two native UIs. Schema in `supabase/migrations`.

**Performance Goals**: Grid paints from on-device (mobile) / already-loaded (web) Binders without a blocking network round-trip. Overlay contents visible within 5 seconds of activation from data already on screen (SC-010). Tile math is O(n) per Binder.

**Constraints**: Signed-out mobile grid/move/create. No account gate to read local Binders. Unpriced never `$0` on a non-empty tile. Do not invent signed-out web Binder. Pipeline unchanged. Clients MUST NOT write entitlements. Distinct-card cap is **per Binder**; a move into a full Binder is refused. Lend tables and UI are untouched. No life counter.

**Scale/Scope**: Grid + drill-in + overlay on two surfaces. One migration. Confirm Trade / filler scoped to Trade Binder. Vocabulary docs + constitution MINOR. Web already lives at `apps/web`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Principles cited: **I, II, III, IV, V**. Product constraints **1–9**. Dual-client DRY.

| Principle / constraint | Status | How this plan complies |
| --- | --- | --- |
| I. Good Enough Ships | Pass | Grid, two defaults, move, overlay, limits. No folders, no share-all-Binders, no Collection-in-Confirm-Trade, no life counter. |
| II. Code That Reveals Intent | Pass | `role=trade` vs display name. Want List is `isWanted`, not a Binder. Cover/value are derived, not stored prices. Lend is a separate type. |
| III. Fail Fast, Never Silent | Pass | Duplicate name refused. Delete Trade Binder refused. Non-empty delete refused. Per-Binder cap refuse on add/move-in. Unpriced tile value is unpriced, not $0. |
| IV. Honest Tests, Shared Contracts | Pass | Matching assertions on both clients for limits, move, cover, names, value snapshot. No new `packages/contracts` Dart package. `free_limits.dart` / `freeLimits.js` stay the numeric source (`binderCards` 50 **per Binder**, `binders` 4). |
| V. Reproducible Ingest | Pass | Pipeline unchanged. Covers use catalog `image_url` already on the Printing. |
| 1. Table is the deadline | Pass | Trade Filler / Confirm Trade still one pile (Trade Binder). Grid is Binder maintenance, not a mid-trade extra step. |
| 2. No gate before value | Pass | No sign-in to use on-device Binders. Web keeps today’s `/binder` account rule. Pro upgrade only on **creating** a 5th Binder, not on opening the grid or reading value. |
| 3. One brand, two peer surfaces | **Amend** | Spec requires web in this product (`apps/web`). Constraint 3 and Engineering Practice still say web is the riftrades repo. MINOR: web lives in `apps/web` here; do not use a second product repo. |
| 4. Vocabulary | **Amend** | Collection as a Binder **name** is spec-required. MINOR update to Constraint 4 and `context.md`: type stays Binder; Trade Binder = tradeable stock; Collection = default keep pile; do not rename the Binder tab. |
| 5. Real prices or nothing | Pass | Tile value = existing Binder total for that pile. Overlay uses observed TCG/CM fields; unpriced never `$0` / `€0`. |
| 6. Local reads | Pass | Grid and overlay from device / already-fetched rows. |
| 7. Server-owned Pro | Pass | Clients read entitlement; 5th Binder is blocked unless Pro is already true. Paywall does not write `rift_entitlements`. |
| 8. Build-time environment | Pass | Unchanged. Tests still need `--dart-define-from-file`. |
| 9. Not a marketplace / rules engine | Pass | No life counter, no gameplay. Lend stays a tracker, uncoupled from Binders. |
| Dual-client DRY | Pass | Shared fixtures, not a shared runtime. Scan stays mobile-native; web gets the same Binder rules without a scanner. |

No unjustified violations. Vocabulary + repo-layout amendments are required and scoped (Complexity Tracking).

### Post-design re-check

Phase 1 adds `rift_binders`, `binder_id`, condition in the owned unique key, dual-client fixtures, overlay/grid UI contracts, and Lend isolation. Confirm Trade is scoped to `role=trade`. Share RPC filters Trade Binder. Overlay input is one Binder’s owned rows (no Lend). Gates still pass **if** `context.md` + constitution vocabulary/repo-layout land in the same implementation change as the UI.

## Project Structure

### Documentation (this feature)

```text
specs/001-fab-parity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── entry-points.md
│   ├── binders.md
│   ├── binder-move.md
│   ├── free-limits.md
│   ├── binder-value-snapshot.md
│   └── binder-value-overlay.md
└── tasks.md             # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
.specify/memory/constitution.md          # MINOR 1.0.0 → 1.1.0: Collection name + apps/web
context.md                               # Trade Binder vs Collection; Lend isolated
docs/ARCHITECTURE.md                     # binders domain + entry identity (sync)
docs/port/WEB-CONVENTIONS.md             # /binder is grid-first; rift_binders

supabase/migrations/
└── YYYYMMDDHHMMSS_rift_multi_binders.sql  # table, uniques, share RPC rewrite

apps/mobile/lib/
├── core/models/binder.dart              # NEW
├── core/models/binder_entry.dart        # binderId; owned identity includes condition
├── core/data/binder_repository.dart     # seed defaults, migrate entries
├── core/data/binders_repository.dart    # NEW
├── core/sync/binder_sync.dart           # identity includes binder + condition
├── core/sync/binders_sync.dart          # NEW
├── core/logic/free_limits.dart          # binders: 4; binderCards per Binder
├── core/logic/binder_move.dart          # NEW
├── core/logic/binder_cover.dart         # NEW
├── core/logic/binder_names.dart         # NEW
├── core/logic/binder_value_snapshot.dart # NEW
├── core/logic/confirm_trade.dart        # Trade Binder only
├── core/providers.dart                  # add target = open Binder or system:trade
└── features/binder/
    ├── binder_screen.dart               # Want List tab + grid vs drill-in; chip onTap
    ├── binder_grid.dart                 # NEW
    ├── binder_list.dart                 # NEW (extract from binder_screen; scoped to one Binder)
    └── binder_value_sheet.dart          # NEW

apps/mobile/test/fixtures/               # byte-identical with web tests/fixtures
apps/mobile/test/contracts/ + widgets/

apps/web/src/
├── utils/freeLimits.js                  # binders: 4; binderCards per Binder
├── utils/binderMove.js                  # NEW
├── utils/binderCover.js                 # NEW
├── utils/binderNames.js                 # NEW
├── utils/binderValueSnapshot.js         # NEW
├── services/binder.js                   # binders CRUD, scoped entries
├── pages/BinderCollection.jsx           # grid when !isWanted; list drill-in
└── components/binder/
    ├── BinderGrid.jsx                   # NEW
    └── BinderValueDialog.jsx            # NEW

apps/web/tests/fixtures/ + contracts/ + components/
```

**Structure Decision**: Dual-client feature in this repo. Golden JSON duplicated under each client’s test tree (constitution: no `packages/contracts` package). Schema in `supabase/migrations` with `rift_` prefix. Mobile UI stays under `features/binder/`. Web grid lives under `apps/web` (`components/binder/`); `/binder` becomes grid-first; `/wants` unchanged. Pipeline, Lend, and life-tracker stay untouched. Card-detail / scan add-to-Binder target Trade Binder unless a Binder list is open.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| MINOR constitution + `context.md` (Collection as a Binder name) | Spec default keep pile is named Collection; Constraint 4 currently forbids that word | Renaming to “Keep Binder” contradicts the spec; shipping without the amendment fails the vocabulary gate |
| MINOR constitution Engineering Practice (web in `apps/web`) | Spec Done-gate is both surfaces in this product; web has been copied here | Leaving Constraint 3 as “do not put product UI under `apps/web/`” would forbid the required web work |

## Generated artifacts (this command)

| Phase | File |
| --- | --- |
| 0 | [research.md](./research.md) |
| 1 | [data-model.md](./data-model.md) |
| 1 | [contracts/](./contracts/) |
| 1 | [quickstart.md](./quickstart.md) |

`tasks.md` is `/speckit-tasks`, not this command.
