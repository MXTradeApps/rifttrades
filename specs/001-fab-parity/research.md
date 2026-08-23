# Research: FAB Trades Parity (Minus Life Counter)

## Decision: `rift_binders` table + `binder_id` on owned entries

**Rationale**: Today `rift_binder_entries` is one pile (`UNIQUE (user_id, card_id, is_wanted)`). A copy cannot live in two Binders, names cannot persist, and Trade Binder cannot be a stable role. A first-class Binder record (name, role, tombstone) plus `binder_id` on owned rows is the smallest model that matches FR-002, FR-011, and FR-023.

Want List stays `is_wanted = true` with `binder_id` null. It is not a Binder.

FAB Trades uses unprefixed `binders` / `binder_entries`. RiftTrades user data stays `rift_`-prefixed so it cannot collide with FAB tables on the shared project.

**Alternatives considered**:
- Encode Binder as a tag string on each entry, no binders table — names, delete, uniqueness, and “always one Trade Binder” have nowhere to live.
- Want List as a Binder tile — forbidden by FR-007.
- Reuse FAB unprefixed `binders` — would mix products on fabloodle.

## Decision: Stable system `client_id`s for the two defaults

**Rationale**: Both clients and a SQL backfill must converge on the same Trade Binder and Collection. Minting random UUIDs on each device would duplicate defaults on first sync.

| Binder | `client_id` | `role` | Deletable |
| --- | --- | --- | --- |
| Trade Binder | `system:trade` | `trade` | never |
| Collection | `system:collection` | `standard` | when empty |
| User-created | client-minted UUID | `standard` | when empty |

`role = trade` is the identity Confirm Trade, Trade Filler, scan-from-grid, public share, and default adds use — **not** the display name (FR-011, FR-015, FR-026).

**Alternatives considered**: Name-equals-“Trade Binder” as identity — breaks on rename. Server-only UUIDs — signed-out mobile cannot seed Collection.

## Decision: Owned identity is `(binder_id, card_id, condition)`

**Rationale**: Two devices adding the same Printing to the **same** Binder must still merge quantity. The same Printing in Trade Binder and Collection must be two rows. FR-008: merge when printing **and** condition match. Drop `UNIQUE (user_id, card_id, is_wanted)`.

Want List keeps a partial unique `(user_id, card_id) WHERE is_wanted`. Owned live unique: `(user_id, card_id, binder_id, condition)`.

Sync `idOf` owned: `binder|{binderId}|{cardId}|{condition}`. Want: `want|{cardId}`. Conflict target must match the new unique.

**Alternatives considered**: Keep the old unique and forbid the same Printing in two Binders — makes move a delete+blocked-add.

## Decision: Distinct-card cap is **per Binder**; `binders: 4` with paywall

**Rationale**: Clarification B. `FreeLimits.binderCards` (50) applies to each Binder’s distinct owned Printings, not one shared pool. The same Printing in two Binders counts as 1 toward each Binder (2 toward capacity in total). A move that would add a **new** Printing to a destination already at 50 is refused. Quantity-up of a Printing already in the destination is uncapped. Creating a 5th live Binder presents the **Pro upgrade** and creates nothing.

This **differs from FAB Trades**, which uses a shared 50 across all Binders and does not refuse moves for `binderCards`. Do not copy that cap helper blindly.

Confirm Trade adding received cards into Trade Binder keeps the existing “never refuse confirm” exception.

Want List cap stays its own number. Do **not** “fix” the existing web vs mobile want-list / loaned drift in this feature (web `wantListCards: 50` / `loanedCards: 1` vs mobile 25 / 25) — that is unrelated data-loss work.

**Alternatives considered**: Shared pool (FAB) — rejected by clarification. Cap Trade Binder only — Collection becomes unlimited inventory. Hide Create at 4 — weaker than a Pro upgrade.

## Decision: Lend is a separate domain; Binders never read or write it

**Rationale**: Clarification. FAB’s overlay includes lent copies that still sit in the Binder. RiftTrades MUST NOT. Do not port lend-from-Binder, Binder totals that include Lend, or Confirm Trade touching Lend groups. `rift_lend_groups` and the Lend UI stay as they are.

**Alternatives considered**: Keep FAB “lent copies remain in Binder value” — contradicted by the spec. Move copies into Lend on lend — that is coupling.

## Decision: Default add target is Trade Binder unless a Binder list is open

**Rationale**: Clarification A. Browse, card details, Scan, and the Binder grid add to `system:trade`. While Collection (or another Binder) is drilled in, adds go there. Want List adds still set `isWanted`.

**Alternatives considered**: Always ask — extra tap at the table. Last-opened Binder after leaving it — surprising. Always Collection — hides new stock from Confirm Trade.

## Decision: Copy FAB UI/helpers; adapt tables, caps, and Lend isolation

**Rationale**: Principle I. FAB already shipped `binder_grid`, `binder_move`, `binder_cover`, `binder_names`, `binder_value_snapshot`, web `BinderGrid` / `BinderValueDialog`. Port those files, rename tables to `rift_*`, change cap counting to per-Binder, drop lend-in-totals, keep Riftbound Normal/Foil.

**Alternatives considered**: Redesign the grid from scratch — slower and more likely to drift from parity. Import life_tracker — explicitly out of scope.

## Decision: No `packages/contracts` package; byte-identical JSON in both test trees

**Rationale**: Constitution IV forbids inventing a shared Dart/JS package for a single use. Both suites MUST still assert the same cases. Put golden JSON under `apps/mobile/test/fixtures/` and `apps/web/tests/fixtures/` with the **same bytes**. Contract markdown in `specs/001-fab-parity/contracts/` is the human spec.

**Alternatives considered**: Add `packages/contracts` like FAB — rejected by this repo’s constitution. Comments-only “keep in sync” — not a test.

## Decision: Constitution + `context.md` update in the same change

**Rationale**: Constraint 4 and `context.md` currently say Binder is the only owned pile and to avoid “Collection.” This feature makes Collection a default Binder **name**. Constraint 3 and Engineering Practice still say web is a separate riftrades repo; web now lives at `apps/web`. Both are MINOR amendments (1.0.0 → 1.1.0) in the same implementation change as the UI.

**Alternatives considered**: Ship UI without amending — fails the vocabulary and peer-surface gates. Rename Collection to “Keep Binder” — contradicts the spec.

## Decision: Overlay is a pure snapshot of the **open** Binder; headline stays the existing total

**Rationale**: Same as FAB 003. No new fetch. Unpriced is null, never zero. Foil CardMarket fields when they exist. Web header may remain TCG-Market-only for the green total; overlay still shows all four marketplace rows. Input excludes Want List and Lend.

**Alternatives considered**: New route / value-over-time chart — out of scope. Include Lend — contradicted by clarification.

## Decision: Share RPC filters Trade Binder; no FK from entries to binders

**Rationale**: `private.get_rift_public_binder_by_token` today returns every live owned row (`is_wanted = false`). After Collection exists, that would leak keep-pile stock. Rewrite it to join `rift_binders` and keep `role = trade` only. Do not add a Postgres FK from `rift_binder_entries.binder_id` to `rift_binders.client_id`: last-write-wins sync can deliver entries before the Binder row.

**Alternatives considered**: Keep “all owned” share — violates FR-017. Hard FK — first sync after migration can fail if entry upserts race Binder upserts.

## Decision: `canAddDistinctCard` counts the **open** Binder, not all owned rows

**Rationale**: Today both clients count distinct owned cards across the single pile. After this feature that would silently reimpose a shared cap. Add/move callers MUST pass that Binder’s distinct count. Qty-up on an existing Printing in that Binder still skips the helper.

**Alternatives considered**: Keep a global owned count — contradicts clarification B.

## Decision: Both surfaces required for Done; web is `apps/web` in this repo

**Rationale**: Clarification A. Manual and automated checks must pass on mobile and web. Do not treat a later riftrades-repo follow-up as Done.

**Alternatives considered**: Mobile-only Done — rejected.
