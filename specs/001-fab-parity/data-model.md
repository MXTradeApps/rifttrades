# Data Model: FAB Trades Parity (Minus Life Counter)

## Binder (new)

A named pile of owned Printings. Not Want List. Not Lend.

| Field | Meaning |
| --- | --- |
| `clientId` | Stable client-minted id. Defaults: `system:trade`, `system:collection`. User Binders: UUID. |
| `name` | Display name. Unique per player after trim + case-fold. |
| `role` | `trade` (exactly one, never deleted) or `standard` (Collection and user-created). |
| `createdAt` | Sort key for non-system Binders. |
| `updatedAt` | Client-supplied; last-write-wins. |
| `deletedAt` | Tombstone. Null = live. Trade Binder is never tombstoned. |

Validation:

- Create: non-empty name after trim; unique among **live** Binders; free players with 4 live Binders cannot create (Pro upgrade, no row).
- Rename: same uniqueness; Trade Binder may rename; `role` does not change.
- Delete: refused when `role = trade`; refused when any live owned entry has `quantity ≥ 1` in this Binder; otherwise tombstone.
- Seed: first-run (no Binder rows at all) inserts Trade Binder (`Trade Binder`, `role=trade`) and Collection (`Collection`, `role=standard`). After that, a missing live Trade Binder is always re-seeded; a missing or tombstoned Collection is never resurrected.

Grid order: Trade Binder, Collection if live, then other live Binders by `createdAt` ascending, then `clientId`.

## Binder entry (existing, extended)

| Field | Meaning |
| --- | --- |
| `printingId` / `card_id` | Printing key |
| `binderId` | Owner Binder `clientId` when `isWanted = false`. Null when `isWanted = true`. |
| `isWanted` | Want List vs owned. Want List is not a Binder. |
| `quantity` | Integer ≥ 1 |
| `condition` | NM/LP/MP/HP/DMG. Descriptive for price; **part of owned identity**. |
| `card` | Denormalized stub (name, image, prices) |
| `addedAt` / `updatedAt` / `deletedAt` | Existing sync fields |

Identity:

| List | Identity |
| --- | --- |
| Owned | `(user, printing, binderId, condition)` |
| Want List | `(user, printing)` with `isWanted` |

A physical copy sits in at most one Binder. The same Printing may exist in two Binders as two rows. The same Printing with two conditions in one Binder is two rows (do not merge across condition).

Migration: every existing `is_wanted = false` row gets `binder_id = system:trade` and keeps its condition. Want List rows stay `binder_id` null. Lend groups are not migrated and not referenced.

## Derived Binder tile

Pure function of one Binder’s live owned entries + catalog + that surface’s Binder-total source. No stored total. Lend is not an input.

| Field | Rule |
| --- | --- |
| `name` | Binder.name |
| `cardCount` | Sum of quantities |
| `value` | Same formula as that Binder’s green / header total for **these** rows only |
| `coverPrintingId` | See [contracts/binders.md](./contracts/binders.md) |
| `coverImageUrl` | Catalog/stub image of that Printing; omitted when no cover |

Empty Binder: `cardCount = 0`, value is a true zero in the chosen currency, no cover. Non-empty all-unpriced: value unpriced (`—`), cover is name-stable (not treated as empty).

## Move (derived write)

Input: source Binder, destination Binder (≠ source), printing, condition, quantity `q` (1…source qty).

- Source qty becomes `old − q` (delete row if 0).
- Destination: if a live row with same printing **and** condition exists, qty += `q`; else insert row with that condition.
- **Per-Binder** distinct-card cap: refuse if the destination would gain a **new** Printing while already at `binderCards` (free). Quantity-only merge into an existing destination row is allowed.
- Want List is not a destination. Lend is not a destination.

## Binder-value snapshot (derived)

Pure function of **one open Binder’s** owned entries + catalog + headline `source`. No I/O. No Lend. No Want List.

See [contracts/binder-value-snapshot.md](./contracts/binder-value-snapshot.md).

## Free-tier counts

| Limit | Count | Cap (free) | At cap |
| --- | --- | --- | --- |
| `binderCards` | Distinct `card_id` among live owned entries **in that Binder** | 50 | Refuse new distinct add or move-in of a new Printing |
| `binders` | Live Binder records | 4 | Pro upgrade; no 5th row |
| `wantListCards` | Distinct Want List `card_id` | existing per client (do not change in this feature) | Unchanged |

Pro: Binder caps removed (existing “Pro removes all of them”).

## Confirm Trade / Trade Filler / default add

Operate only on entries where Binder `role = trade`, except when a Binder list is open (adds go to that open Binder). Received cards insert into Trade Binder. Given cards decrement Trade Binder only. Collection and other Binders are untouched. Lend is untouched. Want List decrement unchanged.

## Lend

No fields, FKs, or derived totals. `rift_lend_groups` is out of this model.

## Postgres (authoritative shapes)

`public.rift_binders`:

- `user_id`, `client_id`, `name`, `role` (`trade` \| `standard`), `created_at`, `updated_at`, `deleted_at`
- `UNIQUE (user_id, client_id)`
- Partial unique live names: `UNIQUE (user_id, lower(btrim(name))) WHERE deleted_at IS NULL`
- Partial unique one trade Binder: `UNIQUE (user_id) WHERE role = 'trade' AND deleted_at IS NULL`
- RLS: own rows only, same pattern as `rift_binder_entries`

`public.rift_binder_entries` changes:

- `binder_id TEXT` null for Want List; required for owned
- Drop `UNIQUE (user_id, card_id, is_wanted)`
- Partial unique owned: `(user_id, card_id, binder_id, condition) WHERE is_wanted = false AND deleted_at IS NULL`
- Partial unique want: `(user_id, card_id) WHERE is_wanted = true AND deleted_at IS NULL`
- Check: `(is_wanted AND binder_id IS NULL) OR (NOT is_wanted AND binder_id IS NOT NULL)`

Backfill: upsert `system:trade` and `system:collection` for users who have binder data; set owned `binder_id` to `system:trade`. Rewrite `private.get_rift_public_binder_by_token` (and the public `get_rift_public_binder` wrapper) so the aggregate is owned live rows whose Binder `role = trade` only — today’s query is every `is_wanted = false` row and would include Collection. No FK from `binder_id` to `rift_binders`.

## Sync

New domain `binders` (client_id identity, tombstones). Binder entries domain identity becomes `binder|{binderId}|{cardId}|{condition}` vs `want|{cardId}`. Conflict target matches the new uniques. Last write wins per record (`docs/ARCHITECTURE.md` Cloud sync). Lend domain unchanged.
