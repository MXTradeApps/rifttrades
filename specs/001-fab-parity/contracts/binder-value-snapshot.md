# Contract: Binder-value snapshot

Pure function. Golden cases (byte-identical):

- `apps/mobile/test/fixtures/binder_value_snapshot.json`
- `apps/web/tests/fixtures/binder_value_snapshot.json`

Implementations: `binder_value_snapshot.dart` / `binderValueSnapshot.js`.

Input: owned rows of **one** Binder + catalog + headline mode. **Not Want List. Not Lend.** Quantity &lt; 1 is dropped.

```text
entries: [{
  printingId, name, finish, isFoil, quantity,
  tcgMarket, tcgLow, tcgMid, tcgHigh,
  cmTrend, cmLow, cmAvg,
  cmTrendFoil, cmLowFoil, cmAvgFoil
}]
source: "tcgplayer" | "cardmarket"
headline: "pricingValue" | "tcgMarketOnly"
```

Foil-aware CardMarket: if `isFoil` and the `*Foil` field is priced, use it; else the non-foil field.

`sourceValue` for top Printings:

- `pricingValue` + tcgplayer → Market else Low else Mid else High (0 unpriced)
- `pricingValue` + cardmarket → foil-aware Trend else Avg else Low
- `tcgMarketOnly` → TCG Market only (existing web header)

Amounts format as USD (TCG) / EUR (CM). `amount === null` → `—`. Overlay headline string is copied from the Binder total control, not from this fixture. Amount closeness: `1e-9` relative (same as trade math).

Observed fields only. Unpriced = `null` / missing / `NaN` / numeric `0`.

| Field | Marketplace | Currency | Overlay use |
| --- | --- | --- | --- |
| TCG Market | TCGplayer | USD | Market total |
| TCG Low | TCGplayer | USD | Low total |
| CM Trend (foil field when the Printing is foil and that field is priced) | CardMarket | EUR | Trend total |
| CM Low (foil-aware the same way) | CardMarket | EUR | Low total |

Never substitute TCG for CM or the reverse. Mid / High / Direct / Avg are not overlay rows.

## Snapshot fields

| Field | Rule |
| --- | --- |
| `copies` | Sum of quantities |
| `distinctPrintings` | Count of Binder rows |
| `foilCopies` | Sum of quantities where the Printing is foil |
| `regularCopies` | `copies − foilCopies` |
| `tcgMarket` / `tcgLow` | `MoneyTotal` USD |
| `cmTrend` / `cmLow` | `MoneyTotal` EUR, foil-aware |
| `tcgUnpricedCopies` | Copies with **neither** TCG Market nor TCG Low priced |
| `cmUnpricedCopies` | Copies with **neither** CardMarket Trend nor Low priced |
| `topPrintings` | 0–5, never padded |

### MoneyTotal

| Field | Rule |
| --- | --- |
| `amount` | Sum of `qty × field` over priced copies; **`null` when `pricedCopies = 0`** |
| `pricedCopies` | Copies included in `amount` |
| `unpricedCopies` | Copies omitted because the field is unpriced |

### TopPrinting

Rank by `contribution` (`qty × sourceValue`) descending, then name, then printing id. Skip unpriced `sourceValue`. Cap at 5.

Headline `sourceValue`:

- Mobile / `pricingValue`: existing `Pricing.value` fallbacks (0 treated as unpriced)
- Web header / `tcgMarketOnly`: TCGplayer Market only (existing web Binder total)

Fixture cases MUST split those two headline modes.
