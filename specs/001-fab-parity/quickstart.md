# Quickstart: FAB Trades Parity (Minus Life Counter)

Validation after implementation. Model: [data-model.md](./data-model.md). UI: [contracts/entry-points.md](./contracts/entry-points.md). Rules: [contracts/binders.md](./contracts/binders.md), [contracts/binder-move.md](./contracts/binder-move.md), [contracts/free-limits.md](./contracts/free-limits.md), [contracts/binder-value-snapshot.md](./contracts/binder-value-snapshot.md), [contracts/binder-value-overlay.md](./contracts/binder-value-overlay.md).

## Prerequisites

Web and mobile both live in this repo.

```bash
cd apps/web && npm install && npm test
cd apps/mobile && flutter test --dart-define-from-file=env/production.json
```

Apply the `rift_multi_binders` migration to the Supabase project the apps already use. Catalog snapshot unchanged. Do not run against FAB unprefixed tables.

## Automated checks

```bash
cd apps/web && npm test
cd apps/mobile && flutter test --dart-define-from-file=env/production.json
```

Expected:

- Both suites pass `free_limits_binders.json` (`binders: 4`, **per-Binder** `binderCards: 50`, move-in refused at cap).
- Both suites pass `binder_move.json`, `binder_cover.json`, `binder_names.json`, `binder_value_snapshot.json`.
- Fixture files under `apps/mobile/test/fixtures/` and `apps/web/tests/fixtures/` are byte-identical for those names.
- Confirm Trade tests decrement/add **Trade Binder** only and do not touch Lend.
- Public binder helper / RPC tests return Trade Binder rows, not Collection.
- No new life-tracker screens or tests.

## Manual — grid (P1)

1. Mobile signed-out: Binder tab shows Trade Binder and Collection. Empty Collection has 0, zero value, no cover. Open Trade Binder; back returns to the grid. Want List tab still works and is not a tile.
2. Mobile with existing Binder cards (pre-update data): those cards are in Trade Binder; Collection is empty; tile count/value match the list.
3. Web signed-in `/binder`: same two tiles; `/wants` unchanged. Tile cover on a non-empty Trade Binder is that Binder’s highest-value card art.

## Manual — Want List (P1)

1. From the Binder grid, open Want List in one step (mobile tab / web `/wants`).
2. Want List cards do not change any Binder tile count or value.

## Manual — move and caps (P2)

1. Move 2 of 3 copies of a Printing from Trade Binder to Collection. Tiles and lists match.
2. Fill Collection to 50 distinct Printings. Try to move a **new** Printing in from Trade Binder — refused. Increase quantity of a Printing already in Collection — allowed.
3. Same Printing in both piles counts as 1 toward each Binder’s cap.

## Manual — value overlay (P2)

1. Open a non-empty Binder. Activate the green / header total. Overlay shows headline matching the control, TCG Market/Low, CardMarket Trend/Low, counts, top Printings. Dismiss restores the list.
2. Grid and Want List do not offer the overlay.

## Manual — create / delete (P3)

1. Create “Side Event”, rename, delete while empty. Trade Binder delete is refused.
2. Free player with 4 Binders: create shows Pro upgrade; still 4 Binders.

## Manual — adds and Lend

1. Add from Browse / card details / Scan with no Binder list open → Trade Binder.
2. Open Collection, add → Collection.
3. Change Lend groups; Binder membership, counts, and values unchanged. Change Binders; Lend groups unchanged.

## Manual — Done gate

Repeat grid, move, and overlay on **both** mobile and web. Missing either surface means the feature is not Done.

## Manual — life counter

Walk Browse → Trade → Confirm Trade → Binder → menu. There is no life counter, match timer, or in-match life tracker.
