# RiftTrades data pipeline

Daily ingest that publishes the Riftbound card + price database to **Supabase**, so
any number of apps (the mobile app, the web app, etc.) can read from one shared source.

```
TCGCSV (TCGplayer, game 89)  ─┐
                              ├─►  transform  ─►  Supabase (upsert)
CardMarket (game 22, EUR)  ───┘                    sets, cards, card_prices, price_history
```

## What it does
1. Fetches sets (TCGplayer "groups") from TCGCSV.
2. Fetches each set's `ProductsAndPrices.csv` (cards, art URLs, USD prices).
3. Fetches CardMarket EU prices and matches them to cards by normalized name.
4. Upserts everything into Supabase and appends a daily row to `price_history`.
5. Logs the run in `pipeline_runs`.

Re-running is idempotent: `cards`/`card_prices` upsert by key, and `price_history`
upserts on `(card_id, captured_on)` so a same-day re-run overwrites that day's snapshot.

## Setup
```bash
cd pipeline
npm install
cp .env.example .env   # then paste your service_role key into .env
```

Get the **service_role** key from: Supabase Dashboard → Project Settings → API →
`service_role` (secret). It bypasses RLS, so keep it server-side only — never in a
client app.

## Run
```bash
npm run dry-run   # fetch + transform + print totals, NO database writes
npm run ingest    # full run: writes to Supabase
```

## Schema (Supabase project `RiftTrades`)
| Table | Purpose |
| --- | --- |
| `sets` | TCGplayer groups / expansions |
| `cards` | one row per printing (normal/foil, alt-art). `collector_number` = scan key |
| `card_prices` | current TCGplayer (USD) + CardMarket (EUR) prices, 1:1 with cards |
| `price_history` | one snapshot per card per day (for charts) |
| `pipeline_runs` | ingest run log (service-role only) |
| `cards_with_prices` | convenience view joining cards + set name + current prices |

All read tables are public read-only via RLS; only the pipeline (service role) writes.

## Daily automation
See `.github/workflows/update-prices.yml`. Add repo secrets `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions).
