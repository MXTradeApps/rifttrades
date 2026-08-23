# Feature Specification: FAB Trades Parity (Minus Life Counter)

**Feature Branch**: `001-fab-parity`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "please bring rifttrades up to parity with fabtrades (minus the life counter)"

## Clarifications

### Session 2026-08-22

- Q: Should RiftTrades add Collection as a keep-pile Binder next to Trade Binder, matching FAB Trades? → A: Yes — Trade Binder (tradeable) + Collection (keep pile), same as FAB Trades
- Q: Can a player lend cards that live in Collection or another non–Trade Binder? → A: Lend and Binders do not interact
- Q: If the same Printing has copies in Trade Binder and Collection, how does that count toward the free Binder card cap? → A: Each Binder counts separately (same card in two piles counts as 2)
- Q: When a player adds a card from Browse, card details, or Scan without a Binder already open, which Binder should receive it? → A: Always Trade Binder unless a Binder list is already open (then that one)
- Q: Does this feature count as done only when both mobile and web have the Binder grid, move, extra Binders, and value overlay? → A: Yes — both surfaces required for Done. Web lives in this product in the same two-client layout as FAB Trades.

## User Scenarios & Testing *(mandatory)*

RiftTrades already matches FAB Trades on the table-core: browse and prices, trade balancer, Confirm Trade, Trade Filler, scan, Want List, lend, sign-in, cloud sync, Pro, onboarding, card details (including price history on mobile), and web card-detail overlay. This spec covers the **remaining player-facing gaps**. It does **not** add a life counter, match timer, or in-match hero life tracker.

### User Story 1 - See my Binders as a grid (Priority: P1)

A player opens the Binder destination. Instead of landing inside a single list of cards, they see a **grid of Binders they own**. Every new player has two Binders waiting for them:

- **Trade Binder** — the cards they are willing to trade away
- **Collection** — the cards they own but are not offering for trade

Each tile is a thumbnail of that Binder. At a glance they can read:

- the Binder **name**
- how many **cards** are in it
- the Binder **value** (the same kind of total they already trust from the green Binder value)
- a **cover image** of the highest-value card in that Binder (empty Binders show no picture)

Tapping or clicking a tile opens that Binder's card list. From there they work the list the way they already do (add, quantity, inspect). A clear back action returns them to the grid, not to a different destination.

Existing tradeable-stock cards from today's single Binder appear in **Trade Binder**. Collection starts empty for those players. Want List cards stay Want List cards.

**Why this priority**: Without the grid and the two defaults, RiftTrades is not at FAB Trades Binder parity. This is the new home of the Binder destination on both peer surfaces.

**Independent Test**: Open the Binder destination as a new player (empty stock) and as a player who already had Binder cards. Confirm the grid shows Trade Binder and Collection, each with name, card count, and value. Non-empty Trade Binder shows a cover of its highest-value card; empty Collection shows no cover. Open Trade Binder, then return to the grid. Existing Binder cards appear in Trade Binder, not Collection.

**Acceptance Scenarios**:

1. **Given** a player who has never created extra Binders, **When** they open the Binder destination, **Then** they see a grid that includes Trade Binder and Collection.
2. **Given** the grid is showing, **When** they look at a tile for a Binder that has priced cards, **Then** it shows that Binder's name, card count, value, and a cover image of its highest-value card.
3. **Given** the grid is showing, **When** they look at an empty Binder tile, **Then** it shows name, card count 0, a true-zero value, and no cover image.
4. **Given** the grid is showing, **When** they activate a tile, **Then** they see that Binder's card list (not Want List, not another Binder's cards).
5. **Given** they are inside a Binder's card list, **When** they go back, **Then** they return to the Binder grid with the same Binders visible.
6. **Given** a player who already had tradeable-stock cards before this feature, **When** they open the grid, **Then** those cards are in Trade Binder and Collection starts empty.
7. **Given** a signed-out player with Binders already on the device, **When** they open the Binder destination, **Then** the grid and Binder lists are available without creating an account.

---

### User Story 2 - Reach Want List without losing it (Priority: P1)

Want List is not a Binder. The player can still get to their Want List from the same Binder area of the app they use today, in one obvious step, after the Binder destination becomes a grid.

They do not have to open Trade Binder or Collection to find Want List. Want List cards are not mixed into any Binder's count or value.

**Why this priority**: Hiding Want List behind a Binder would be a regression of a core trader surface. FAB Trades kept Want List reachable; RiftTrades must too.

**Independent Test**: From the Binder destination (grid showing), open Want List and confirm it is the existing Want List (not a Binder named Want List). Return to the Binder grid. Confirm Want List cards did not change any Binder tile's count or value.

**Acceptance Scenarios**:

1. **Given** the Binder grid is on screen, **When** the player looks for Want List, **Then** it is reachable without opening a Binder first.
2. **Given** they have cards on Want List and cards in Trade Binder, **When** they compare the two surfaces, **Then** Want List cards do not appear in any Binder tile's card count or value.
3. **Given** they open Want List and then return, **When** they are back, **Then** they see the Binder grid again (or the Want List surface they already used on that platform), not a blank Binder.

---

### User Story 3 - Move cards between Binders (Priority: P2)

The player has the same Printing in the wrong pile — for example in Collection when they now want to offer it, or in Trade Binder when they want to keep it. From a Binder's card list they move some or all copies of a Printing into another of their Binders.

The source Binder loses that quantity. The destination Binder gains it. If the destination already has that Printing at the same condition, quantities combine. Binder tile counts and values on the grid update to match.

Moving is not deleting. It is not adding to Want List.

**Why this priority**: Two default Binders only pay off if stock can change piles. The grid can ship without move, but move is the reason Collection exists beside Trade Binder.

**Independent Test**: Put a Printing with quantity 3 in Trade Binder. Move 2 copies to Collection. Confirm Trade Binder shows 1 remaining, Collection shows 2, and both tiles' counts and values match the lists.

**Acceptance Scenarios**:

1. **Given** a Printing in Trade Binder and an empty Collection, **When** the player moves that Printing to Collection, **Then** it is gone from Trade Binder and present in Collection with the same quantity, finish, and condition.
2. **Given** quantity 4 of a Printing in one Binder, **When** they move 2 copies to another Binder, **Then** 2 remain in the source and 2 appear in the destination.
3. **Given** the destination already has that Printing at the same condition, **When** they move more copies in, **Then** the destination quantity is the sum and there is still one row for that Printing.
4. **Given** they just moved cards, **When** they return to the grid, **Then** each tile's card count and value reflect the new piles.
5. **Given** they are looking at Want List, **When** they use Binder-to-Binder move, **Then** Want List is not offered as a destination (Want List is not a Binder).
6. **Given** a free player whose Collection is already at its distinct-card cap and who has a Printing only in Trade Binder, **When** they try to move that Printing into Collection, **Then** the move is refused, Trade Binder is unchanged, and they are told Collection is at its card limit (Pro upgrade if that is how Binder adds are gated today).

---

### User Story 4 - Open Binder value from the green total (Priority: P2)

A player is inside a Binder. They already see a green running total of what that Binder is worth. They tap or click that total. A **detail overlay** opens over the Binder and shows a fuller picture of the same stock — not a different page, not a new account wall.

They can see what the whole Binder is worth under each marketplace figure they already trust on a single card:

- **TCGplayer Market** and **TCGplayer Low** (US dollars)
- **CardMarket Trend** (CardMarket's market-equivalent) and **CardMarket Low** (euros)

Each total is quantity-weighted. Missing catalog prices are **unpriced**, never zero. The player can tell how many copies were left out of a given total.

The same overlay answers "what is this pile, besides the dollars?":

- **Copies** in the Binder (sum of quantities) and **distinct Printings**
- **Foil vs Regular** copy counts
- **Unpriced copies** per marketplace
- **Top Printings by value** — up to five Printings that make up most of the Binder, each with name, finish, quantity, and contribution using the same price source as the green total

Closing the overlay returns them to the same Binder list, tab, and scroll position. The Binder itself is unchanged. The green total is Binder-list only — not Want List, not the grid.

**Why this priority**: FAB Trades already lets a player inspect Binder value this way. RiftTrades shows the green total but it does nothing. The grid can ship first; this overlay is how the total earns trust.

**Independent Test**: With at least one Binder card, activate the green Binder total. Confirm a detail overlay appears with a Binder value that matches the total they tapped, four marketplace totals that omit unpriced copies, counts that match the list, and a top-value list. Dismissing it leaves the Binder list unchanged.

**Acceptance Scenarios**:

1. **Given** an open Binder showing a green total (Binder is not empty), **When** the player activates that total, **Then** a detail overlay appears over that Binder (the Binder behind is not replaced).
2. **Given** the overlay is open, **When** they dismiss it (close control, tap/click outside, or the platform's back/Escape gesture), **Then** they are back on the same Binder with the same list and scroll context.
3. **Given** the overlay is open, **When** they read the headline Binder value, **Then** it matches the green total they opened from, using the same price source they already chose in Settings.
4. **Given** Binder Printings with catalog numbers, **When** the overlay is open, **Then** they see TCGplayer Market and Low in US dollars and CardMarket Trend and Low in euros, each equal to the sum of (that field × quantity) across priced copies. Foil Printings use CardMarket's foil figures when those exist.
5. **Given** a Printing with no TCGplayer Low (or no CardMarket Low), **When** that Printing is in the Binder, **Then** it does not contribute $0 / €0 to that marketplace total; the overlay shows it as unpriced for that figure and reports how many copies were omitted.
6. **Given** the player's Settings use one marketplace, **When** they open the overlay, **Then** they still see **both** TCGplayer and CardMarket totals.
7. **Given** a mix of quantities, foils, and unpriced copies, **When** the overlay is open, **Then** copy count, distinct Printing count, foil vs Regular, unpriced counts, and up to five top Printings match the Binder list for that snapshot.
8. **Given** a signed-out player with Binder cards already on the device, **When** they open the overlay, **Then** they can read the breakdown without signing in.
9. **Given** the Binder is empty or they are on Want List or the Binder grid, **When** there is no green total for an open Binder, **Then** there is no Binder-value control to open.

---

### User Story 5 - Add, rename, and delete Binders (Priority: P3)

The player can create additional named Binders (for a side event, a keep pile, a friend's cards they are holding), up to **4 Binders total on the free tier**. Each Binder MUST have a unique name. They can rename any Binder to another unused name. They can delete Collection and user-created Binders once those Binders are empty.

**Trade Binder cannot be deleted.** It is always on the grid. The player may rename Trade Binder; the renamed Binder is still the one used for trades.

**Why this priority**: The grid is built for "Binders the user has," which can grow. The non-deletable Trade Binder is the safety rail. Extra Binders are valuable after the two defaults, move, and value inspect already work.

**Independent Test**: Create a Binder named "Side Event", add no cards, rename it, then delete it. Attempt to delete Trade Binder and confirm the product refuses. Confirm Trade Binder is still on the grid. As a free player with 4 Binders, try to create a fifth and see the Pro upgrade with no 5th Binder created.

**Acceptance Scenarios**:

1. **Given** a free player with fewer than 4 Binders (or a Pro player), **When** they create a new Binder with a unique name, **Then** a new tile appears with that name, 0 cards, and an empty value.
2. **Given** a user-created Binder or Collection, **When** they rename it to a name no other Binder uses, **Then** the tile and the open Binder header show the new name.
3. **Given** a Binder already named "Side Event", **When** they try to create or rename another Binder to "Side Event" (including different capitalization or extra spaces), **Then** the change is refused and no second Binder has that name.
4. **Given** Trade Binder, **When** they rename it to a unique name, **Then** the tile shows the new name, it still cannot be deleted, and Trade Filler / Confirm Trade still use that Binder as tradeable stock.
5. **Given** Trade Binder, **When** they try to delete it, **Then** deletion is refused and Trade Binder remains on the grid (empty or not).
6. **Given** Collection or a user-created Binder that still has cards, **When** they try to delete it, **Then** deletion is refused until they move or remove the cards.
7. **Given** Collection or a user-created Binder with 0 cards, **When** they delete it, **Then** it leaves the grid.
8. **Given** a free player who already has 4 Binders, **When** they try to create another, **Then** they see the Pro upgrade, no 5th Binder is created, and their existing Binders are unchanged.
9. **Given** they renamed or created Binders on one surface while signed in, **When** they open Binder on the other peer surface after their Binders are available there, **Then** each Binder shows the same unique name.

---

### Edge Cases

- **Empty Binder tile**: Card count is 0. Value is a true zero in the player's chosen currency. There is no cover image. The tile is still tappable and opens an empty list.
- **Cover image with unpriced cards**: If the Binder has copies but none have a catalog price for the chosen source, the tile still shows a cover (a stable pick among those Printings) rather than looking empty.
- **All copies unpriced**: Card count is still the number of copies. Value is shown as unpriced for that Binder, never as a fake $0.00 / €0.00.
- **Duplicate Binder names**: Not allowed. Create or rename that would match another Binder's name (ignoring letter case and extra spaces) is refused.
- **Many Binders**: The grid scrolls. The player can still reach Trade Binder, Collection (if it exists), Want List, and create/delete actions.
- **Move and per-Binder distinct-card caps**: Each Binder has its own distinct-card free-tier cap (today's Binder number, applied per pile). A Printing in Trade Binder and Collection counts as one distinct card in each Binder (two toward capacity in total). A move that would add a **new** Printing to a destination already at its cap MUST be refused; a move that only increases quantity of a Printing already in the destination MUST succeed. A move that empties a Printing from the source frees that source slot.
- **Free player at 4 Binders**: Creating another Binder opens the Pro upgrade. No 5th Binder is created unless they already have Pro. Deleting an empty Binder frees a slot.
- **Move of quantity 0 or more than the source holds**: Not allowed. Source quantity never goes negative.
- **Same Printing, different condition**: Condition stays with the copies that move. Copies do not merge across different conditions.
- **Confirm Trade / Trade Filler**: Only **Trade Binder** is tradeable stock. Filler suggests from Trade Binder. Confirm Trade removes given copies from Trade Binder and adds received copies to Trade Binder. Collection and other Binders are not auto-reconciled.
- **Scan or pick-add**: If a Binder list is already open, new cards enter that Binder. If the player adds from Browse, card details, Scan, or the Binder grid (no Binder list open), new Binder adds go to **Trade Binder**. Adds never go to Collection unless Collection's list is the open Binder.
- **Lend vs Binder**: Lend and Binders do not interact. Opening, moving, totaling, sharing, or Confirm Trade on Binders MUST NOT create, remove, or change Lend groups. Lending MUST NOT add, remove, or move copies in any Binder. Binder card counts, tile values, and the value overlay MUST ignore Lend.
- **Value overlay twice**: Only one Binder-value overlay; a second activation does not stack a second copy.
- **Currency**: TCGplayer figures stay in US dollars and CardMarket figures stay in euros in the same view; the product does not silently convert one into the other.
- **Offline / signed out**: Grid, open, move, create, rename, delete, and value inspect work on Binders already on the device.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Binder destination MUST open on a grid of the player's Binders rather than on a single undifferentiated card list, on both peer surfaces (mobile and web).
- **FR-002**: Every player MUST start with two default Binders named **Trade Binder** (tradeable stock) and **Collection** (keep pile) if those Binders have not been removed by the player (Trade Binder cannot be removed). Collection is a Binder name, not a different product type. The product MUST NOT treat Collection as a forbidden word or collapse it into a single Binder.
- **FR-003**: Each Binder tile MUST show that Binder's **name**, **card count**, **value**, and a **cover image** of the Printing with the largest contribution to that Binder's value (quantity × the same price source as the tile total). An empty Binder MUST show no cover image. A Binder that has copies but no priced contribution MUST still show a cover.
- **FR-004**: Card count on a tile MUST be the total number of copies in that Binder (sum of quantities), not Want List copies, and not copies in other Binders.
- **FR-005**: Tile value MUST use the same price source and quantity-weighted rules as that Binder's green Binder total. Unpriced copies MUST NOT display as zero. An empty Binder MAY show a true zero.
- **FR-006**: Activating a tile MUST open that Binder's card list. Back MUST return to the Binder grid.
- **FR-007**: Want List MUST remain reachable from the Binder area without opening a Binder first. Want List MUST NOT be modeled as a Binder tile, MUST NOT accept Binder-to-Binder moves, and MUST NOT contribute to Binder tile counts or values.
- **FR-008**: The player MUST be able to move some or all copies of a Printing from one of their Binders to another. Identity (Printing, finish, condition) MUST be preserved. Destination quantities MUST merge when the same Printing and condition already exist there.
- **FR-009**: After a move, both Binders' lists, tile card counts, tile values, and cover images MUST match the new quantities.
- **FR-010**: The player MUST be able to create additional named Binders while under their Binder-count limit. A free player MUST NOT have more than **4 Binders** (Trade Binder and Collection count toward the 4). A Pro player is not limited to 4 Binders. Creating a Binder that would exceed the free limit MUST show the **Pro upgrade** and MUST NOT create a 5th Binder.
- **FR-011**: The player MUST be able to rename any Binder, including Trade Binder. Binder names MUST be unique per player (letter case and extra spaces do not make a name distinct). Create or rename that would duplicate another Binder's name MUST be refused. Renaming Trade Binder MUST NOT make it deletable and MUST NOT change which Binder is tradeable stock.
- **FR-012**: Trade Binder MUST NOT be deletable, including when it is empty.
- **FR-013**: Collection and user-created Binders MUST be deletable only when they contain zero copies. A delete attempt on a non-empty Binder MUST be refused and MUST tell the player to move or remove the cards first.
- **FR-014**: Existing tradeable-stock cards from before this feature MUST appear in Trade Binder. Want List entries MUST remain Want List entries. Collection MUST start empty for those players.
- **FR-015**: Trade Filler and Confirm Trade MUST use Trade Binder as the only tradeable stock. Received cards enter Trade Binder. Given cards leave Trade Binder. Other Binders MUST NOT be silently edited by Confirm Trade.
- **FR-026**: Adds to Binder from Browse, card details, Scan, or the Binder grid (no Binder list open) MUST go to Trade Binder. Adds initiated while a Binder list is open MUST go to that open Binder. Adds MUST NOT go to Collection unless Collection's list is the open Binder.
- **FR-016**: The distinct-card free-tier cap MUST apply **per Binder**, using the same numeric limit each Binder has today. Want List keeps its own separate cap. The same Printing in two Binders MUST count as one distinct card in each Binder (two toward capacity in total). Moving a Printing into a Binder where it is not already present MUST consume a distinct-card slot in the destination and MUST free a slot in the source when that Printing's last copy leaves. A move that would put a free player's destination Binder over its distinct-card cap MUST be refused and MUST NOT change either Binder.
- **FR-017**: Public Binder share MUST continue to share Trade Binder (the trade list). Sharing Collection or custom Binders is out of scope.
- **FR-018**: The Binder total control (the green Binder value on an open Binder) MUST be activatable and MUST open a Binder-value detail overlay over that Binder.
- **FR-019**: The overlay MUST NOT navigate the player away from the Binder. Dismiss MUST restore the same Binder, list, and scroll context with no Binder edits as a side effect.
- **FR-020**: The overlay MUST show a headline **Binder value** that matches the green total, plus quantity-weighted **TCGplayer Market**, **TCGplayer Low**, **CardMarket Trend**, and **CardMarket Low**. Unpriced MUST display as unpriced, never as zero. The four marketplace totals MUST appear regardless of which price source Settings currently uses.
- **FR-021**: The overlay MUST show total copies, distinct Printing count, foil vs Regular copy counts, unpriced copy counts per marketplace, and up to five Printings with the largest contribution to the headline Binder value. It MUST NOT invent Printings or pad the list.
- **FR-022**: Inspecting Binder value MUST work without an account when the Binder is already available on the device.
- **FR-025**: Lend and Binders MUST NOT interact. Binder actions (grid, open, move, create, rename, delete, share, Confirm Trade, Trade Filler, add-to-Binder, Binder totals, value overlay) MUST NOT read or write Lend. Lend actions MUST NOT read or write any Binder. Binder counts and values MUST NOT include Lend copies.
- **FR-023**: The same Binder grid, move, create/rename/delete, and Binder-value detail MUST be available on both peer surfaces (mobile and web). This feature is not Done until both surfaces have those capabilities. Layout may be native to each surface; names, counts, values, and vocabulary MUST match. Web and mobile are clients in this same product (the same two-client layout as FAB Trades), not a separate web-only product.
- **FR-024**: Finish vocabulary MUST stay Riftbound **Normal / Foil**. The product MUST NOT import Flesh and Blood foil subtype names or a life counter, match timer, or in-match life tracker.

### Key Entities

- **Binder**: A named pile of owned Printings. A player can have several. This is the type.
- **Trade Binder**: The default Binder that is **tradeable stock**. Confirm Trade, Trade Filler, and public share use this Binder. Always present; never deletable. Renaming it does not change its role.
- **Collection**: The default Binder **name** for owned cards the player is not offering for trade (the keep pile). Collection is a display name, not a different product type.
- **Want List**: Cards a player is looking to acquire. Not a Binder.
- **Printing**: A specific physical version of a card (set + finish). Binder and trade entries reference printings, not card names. Finish is Riftbound Normal / Foil.
- **Binder value**: The headline total already shown in green, from the player's chosen price source, quantity-weighted across that Binder's Printings.
- **Marketplace totals**: Quantity-weighted sums of a single catalog field across the open Binder: TCGplayer Market, TCGplayer Low, CardMarket Trend, CardMarket Low.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Binder destination, a player can see all of their Binders, including Trade Binder and Collection (when Collection still exists), in one screen without opening each list first.
- **SC-002**: A first-time player can identify Trade Binder and Collection by name on that screen in under 10 seconds.
- **SC-003**: Each tile's name, card count, and value match that Binder's list for the same snapshot, 100% of the time.
- **SC-004**: A player can open a Binder from the grid and return to the grid in two actions without losing their place in the app.
- **SC-005**: A player who already used Want List can open Want List from the Binder area without opening a Binder first, on the first attempt.
- **SC-006**: A player can move copies from Trade Binder to Collection (or the reverse) and see both lists and both tiles update correctly in one move.
- **SC-007**: 100% of attempts to delete Trade Binder fail, and Trade Binder remains on the grid.
- **SC-008**: After migration, 100% of previously tradeable Binder cards are in Trade Binder and 0% of Want List cards appear as Binder cards.
- **SC-009**: A free player cannot create a 5th Binder; they see the Pro upgrade, and afterward they still have exactly 4 Binders and the same cards.
- **SC-010**: From a non-empty open Binder, a player can open the value breakdown in one activation of the green total and read TCGplayer Low vs CardMarket Low within 5 seconds without leaving the Binder.
- **SC-011**: 100% of priced copies are reflected in the matching marketplace total (quantity × catalog field). Unpriced copies never appear as $0.00 or €0.00.
- **SC-012**: A signed-out player with on-device Binders can complete grid, open, move, and value inspect without creating an account.
- **SC-013**: After a signed-in player names or renames a Binder on one surface, the other surface shows that same name for that Binder, and no two Binders share a name on either surface.
- **SC-014**: A tester walking Browse → Trade → Confirm Trade → Binder cannot find a life counter, match timer, or in-match life tracker anywhere in the product.
- **SC-015**: At least 90% of first-time testers asked "which pile is for trading?" choose Trade Binder from the grid without help.
- **SC-018**: An add from Browse, card details, or Scan with no Binder list open lands in Trade Binder 100% of the time. An add while Collection (or another Binder) is open lands in that open Binder, not Trade Binder.
- **SC-019**: A tester can complete the Binder grid, open a Binder, move a card, and open the value overlay on mobile and on web; missing either surface means the feature is not Done.

## Assumptions

- **Parity means player-facing FAB Trades, not every operator tool.** Shared features already in RiftTrades (browse, balancer, scan, sync, Pro, mobile price history, web card-detail overlay, and so on) are baseline, not re-specified. Product analytics is out of scope.
- **Life counter is excluded.** FAB Trades' in-match life tracker (split-screen life totals, round timer, hero picker, audit history) MUST NOT be ported.
- **Collection is owned-not-for-trade (confirmed).** RiftTrades adopts FAB Trades' two defaults: Trade Binder is tradeable stock; Collection is the default keep-pile Binder *name*. The domain type remains Binder. This supersedes the older "Binder is the only owned pile / avoid Collection" line in living docs. Product Constraint 4 in the constitution MUST be amended to match before or with this feature.
- **Want List stays a sibling, not a tile.** On mobile it remains the other view in the Binder destination. On web it remains the existing Want List destination.
- **Both peer surfaces (confirmed).** Mobile and web both get the grid, move, extra Binders, and value overlay. The feature is not Done until both have them. Web lives in this product in the same two-client layout as FAB Trades (not a separate web repo).
- **Finish is Riftbound Normal / Foil**, not FAB pitch or Cold/Rainbow/Gold foil names.
- **Free limits (confirmed):** today's Binder distinct-card number applies **per Binder**, not as one shared pool. Want List and loaned caps are unchanged. The 4-Binder count cap is additional for free players.
- **Public share stays Trade Binder only.**
- **Binder value overlay inspects the open Binder**, not the whole grid. No value-over-time chart.
- **Migration is one-way and lossless** for existing Binder and Want List rows.
- **No account gate** to use Binders already on the device.
- **Lend is independent of Binders (confirmed).** Today's FAB-style "lent copies still sit in the Binder" rule is rejected for RiftTrades. The two features share no membership, totals, or actions.
- **Default add destination (confirmed):** Trade Binder, unless a Binder list is already open — then that open Binder.

## Out of Scope

- Life counter, life tracker, match timer, hero-for-life picker, or any in-match play aid.
- Product analytics / usage tracking.
- Rebuilding features RiftTrades already shares with FAB Trades (auth, sync, Pro paywall, scan, onboarding, mobile price history, web card-detail overlay, Confirm Trade, Trade Filler, lend).
- Treating Want List as a Binder, or moving cards from a Binder onto Want List via this move action.
- Nested Binders, folders, or tags.
- Sharing or publishing Collection and custom Binders.
- Decks, set-completion binders, or cost-basis / purchase-price tracking.
- Condition-adjusted pricing.
- Coupling Lend to Binders (lend-from-Binder, Binder totals that include Lend, or moving copies into Lend from a Binder).
- Automatically moving Collection cards during Confirm Trade.
- Binder value-over-time charts.
- Cross-player Binder transfer.
- Web price-history chart (neither shipping product shows it on web today).
- FAB-specific game vocabulary (pitch, hero life totals, Cold Foil / Rainbow Foil / Gold Foil as product nouns).
