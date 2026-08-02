# Phase 12 — Trade history, Confirm Trade, and calculator layout

Port trade history, Confirm Trade (history write + binder reconcile), unnamed
history saves, landscape grid / portrait list densification, and `clearTrade`.

Prerequisite: Phase 11 is `Done`. Read [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md).

Source: `/Users/joseescaler/Documents/fabtrades/apps/web`
Target: `/Users/joseescaler/Documents/riftrades`

## Steps

### 1. Port `tradeHistory.js` and `TradeHistory.jsx`

Copy:

| Source | Target |
| --- | --- |
| `src/services/tradeHistory.js` | `src/services/tradeHistory.js` |
| `src/pages/TradeHistory.jsx` | `src/pages/TradeHistory.jsx` |

After copy:

- Every `.from('trades')` → `.from('rift_trades')`
- Entitlement reads already go through `fetchEntitlement` (Phase 10) — keep that
- Preserve `saveTradeToHistory(name, …, { unnamed: true })` so Confirm Trade can
  insert rows with `name: null`
- Preserve free-window trim (`tradesOverFreeLimit` / tombstone oldest)
- Brand renames in UI copy (FAB Trades → RiftTrades)
- Keep SignInDialog gate for signed-out visitors

Add route in `src/App.jsx`:

```jsx
import TradeHistory from './pages/TradeHistory.jsx';
<Route path="/history" element={<TradeHistory />} />
```

Hand-merge Header drawer: add **Trade History** → `/history` (source already
has it; target may not). LoginButton account menu in source may also link to
history — keep that if LoginButton already has it from Phase 10.

### 2. Port Confirm Trade util + service

Copy:

| Source | Target |
| --- | --- |
| `src/utils/confirmTrade.js` | `src/utils/confirmTrade.js` |
| `src/services/confirmTrade.js` | `src/services/confirmTrade.js` |

These should not hard-code table names if they go through `tradeHistory` /
`binder` helpers — verify after copy. Behaviour to preserve:

1. Reject empty have/want (or missing printing ids)
2. `saveTradeToHistory(null, …, { unnamed: true })` → `rift_trades`
3. Load binder via `getBinderEntries`
4. Reconcile with `reconcileBinderAfterTrade`:
   - Optional: decrement given cards from binder
   - Optional: add received cards to binder as NM (skips free-tier distinct-card
     check — same as source)
   - **Always** decrement received cards from want list
5. Persist via `upsertEntry` / `removeEntry`

### 3. Hand-merge `TradeSummary.jsx`

Read target `src/components/elements/TradeSummary.jsx` first. It has Riftbound-
only UI that **must survive**:

- Find Filler button / `FindFillerDialog`
- TCGPlayer vs CardMarket price-source toggle
- Market / Low price-type toggle

From source TradeSummary, **add**:

- **Save** dialog (named history save via `saveTradeToHistory`)
- **Confirm Trade** dialog with checkboxes (remove given from binder / add
  received to binder) calling `confirmTrade`
- Free-limit / auth awareness already used by source (sign-in prompt when
  needed)
- `clearTrade` wiring if the summary exposes a clear control that Home passes in

Do **not** replace the whole file with the FAB version. Do **not** drop
FindFiller or CardMarket controls.

### 4. Hand-merge `CardList.jsx` and `CardPanel.jsx`

From source, take:

- `viewMode` prop: `'list' | 'grid'`
- Grid layout densification (`minmax` column sizes for landscape / portrait as
  in source)
- Compact quantity controls in grid mode
- Landscape `minHeight: 0` / denser title+search in CardPanel
- Dialog search on small screens if source has it

Preserve in target:

- Riftbound gradient API — target uses
  `getCardGradient(subType, rarity, isDark)` (or similar). Do **not** switch to
  FAB's pitch-based gradient signature
- CardMarket / price-source display if present in list rows

### 5. Hand-merge `Home.jsx`

From source:

- `panelView = isLandscape ? 'grid' : 'list'`
- Pass `viewMode={panelView}` into both CardPanels / CardLists
- Tighter landscape gap/padding
- Pass `clearTrade` into TradeSummary if Step 3 needs it

Preserve in target:

- Embedded `SetView` / `onNavigate` set browsing
- `fetchLastUpdatedTimestamp` (or whatever the target uses for the Header
  timestamp) — do not require FAB's catalog-metadata-only path

### 6. Hand-merge `useTradeState.js` additions

On top of Phase 11 draft persistence, add from source if not already present:

- `clearTrade()` — clears have/want lists and the URL trade params
- `loadTradeFromHistory(trade)` — hydrates lists from a history row (used by
  TradeHistory "load" actions)

Keep Riftbound URL encoding helpers intact.

### 7. Hand-merge `SearchInput.jsx` dense mode

From source, take `size="small"` / dense Autocomplete styling used on binder and
calculator panels. Do not change search matching logic in
`src/utils/searchUtils.js` beyond what dense mode requires.

### 8. Port tests

Copy and adapt:

| Source | Target |
| --- | --- |
| `tests/services/confirmTrade.test.js` | `tests/services/confirmTrade.test.js` |
| `tests/utils/confirmTrade.test.js` | `tests/utils/confirmTrade.test.js` |
| `tests/services/tradeHistory.test.js` | `tests/services/tradeHistory.test.js` |

If source has CardList / CardPanel tests that cover `viewMode`, copy only the
cases that still make sense under the Riftbound gradient API; skip FAB pitch
assertions.

Edits:

- Table name `rift_trades` in tradeHistory mocks
- Binder helpers mocked as in source (they already target `rift_*` from Phase 11)

## Verify

From `/Users/joseescaler/Documents/riftrades`:

```bash
npm test
npm run lint
npm run build
```

Checks:

- [ ] New confirmTrade / tradeHistory tests pass
- [ ] `npm run build` exits 0
- [ ] `rg "from\\('trades'\\)|from\\(\"trades\"\\)" src` returns no matches
- [ ] `rg "rift_trades" src/services` finds tradeHistory call sites
- [ ] TradeSummary still exposes Find Filler and CardMarket / price toggles
- [ ] Home uses grid in landscape and list in portrait
- [ ] Manual: Confirm Trade with both checkboxes on — unnamed row appears in
      `/history`, binder quantities update, want-list quantities drop
- [ ] Manual: Save (named) still works without binder reconcile
- [ ] Manual: Clear trade empties both panels and the URL

## Commit

Web repo:

```bash
git add -A
git commit -m "Add web trade history, confirm trade, and denser calculator layout"
```

Mobile monorepo README status:

```bash
git add docs/port/README.md
git commit -m "Mark port Phase 12 done"
```
