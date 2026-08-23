# Contract: Binder move

Dual-client write rule. Golden cases (byte-identical):

- `apps/mobile/test/fixtures/binder_move.json`
- `apps/web/tests/fixtures/binder_move.json`

Implementations: `apps/web/src/utils/binderMove.js`, `apps/mobile/lib/core/logic/binder_move.dart`.

Both suites MUST assert the same JSON. This is not an HTTP API.

## Input

```text
binders: [{ clientId, role, deletedAt }]
entries: [{
  printingId, binderId, isWanted, quantity, condition
}]
fromBinderId, toBinderId
printingId, condition
quantity: int
freeBinderCardsCap: int   # 50 for free; ignored when isPro
isPro: bool
```

Want List rows (`isWanted = true`) are never moved by this helper. Lend is not in the input.

## Success

When `fromBinderId ≠ toBinderId`, both Binders are live, `quantity` is 1…source qty, the source row exists, and the destination per-Binder cap allows the write:

- Source quantity decreases by `quantity` (row removed at 0).
- Destination: if a row with the same `printingId` **and** `condition` exists, add `quantity`; else insert that condition.
- Other Binders and Want List unchanged.
- Distinct count **in the destination** increases by 1 only when the Printing was not already there.

## Refuse (entries unchanged)

- `quantity < 1` or `quantity >` source qty
- `fromBinderId === toBinderId`
- Missing source row
- Destination is not a live Binder (unknown, tombstoned, or Want List)
- Free player: destination already has `binderCards` distinct Printings **and** this Printing is new to the destination

Trade Binder as destination is allowed (it is a Binder). Quantity-up of a Printing already in the destination MUST NOT be refused for the cap.

## Confirm Trade (related, not this helper)

`reconcileBinderAfterTrade` decrements/adds **Trade Binder** (`role = trade`) only. Do not call move for confirm. Do not touch Lend.
