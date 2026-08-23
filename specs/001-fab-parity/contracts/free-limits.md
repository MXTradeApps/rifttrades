# Contract: Free limits (multi-Binder)

Implementations: `freeLimits.js` / `free_limits.dart`. Golden cases (byte-identical):

- `apps/mobile/test/fixtures/free_limits_binders.json`
- `apps/web/tests/fixtures/free_limits_binders.json`

Both suites MUST assert the JSON. Numeric sources stay in the Dart/JS modules (constitution IV).

## Limits (free)

| Key | Cap | Count | Behaviour |
| --- | --- | --- | --- |
| `binderCards` | 50 | Distinct owned `card_id` **in that one Binder** | `refuse` new distinct add or move-in of a new Printing |
| `binders` | 4 | Live Binder records (Trade Binder and Collection count) | `paywall` — show Pro upgrade; create nothing |
| `wantListCards` | existing (do not change) | Distinct Want List `card_id` | `refuse` (unchanged) |

Pro removes Binder caps (existing rule).

## binderCards (per Binder)

- Qty-up on a Printing already in **that** Binder: not capped.
- Add of a Printing new to that Binder: capped at 50 for free.
- Same Printing in Trade Binder and Collection: counts as 1 in each Binder.
- Move into a Binder at 50 that does not yet have that Printing: refuse.
- Move that only increases quantity of a Printing already in the destination: allow.
- Confirm Trade add into Trade Binder: still never blocked by this cap (existing confirm-trade exception).
- `canAddDistinctCard` / `_canAddNewCard` MUST receive that Binder’s distinct count, not a sum across all Binders.

## binders

- Live count includes empty Trade Binder and empty Collection.
- Tombstoned Collection does not count; player may create another Binder (including named Collection) if under 4.
- 3 live Binders → create allowed; 4 live → create forbidden for free, allowed for Pro.

`behaviour.binders = "paywall"` means the create UI presents the Pro upgrade. It does not write entitlements.

Do not use `paywall` for `binderCards` in this feature (keep `refuse`).
