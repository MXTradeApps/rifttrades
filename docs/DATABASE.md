# Shared Riftbound Card & Price Database

Supabase Postgres project that the Flutter app and the daily ingest both use.
Catalog data is populated by the Node service under `services/price-pipeline`
from TCGCSV (TCGplayer) + CardMarket.

## Connection

| | |
| --- | --- |
| Project | `fabloodle` (`cnmxaccamqshgvesieez`) |
| URL | `https://cnmxaccamqshgvesieez.supabase.co` |
| Publishable key | `sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom` |

The publishable key is safe to ship in client apps. Catalog tables are **public
read-only** via RLS; only the ingest `service_role` key can write them. Never put
the `service_role` key in a client app.

## Ownership

RiftTrades production owns fabloodle's unprefixed catalog and the `rift_*`
user-data tables. The project still contains leftover `fab_*` / game tables from
earlier use — do not alter those. Always use the `rift_*` names for RiftTrades
user data in app code and migrations.

| Purpose | RiftTrades table |
| --- | --- |
| Catalog (sets, cards, prices, history, config) | Unprefixed: `sets`, `cards`, `card_prices`, `price_history`, `pipeline_runs`, `app_config`, view `cards_with_prices` |
| Binder + want list | `rift_binder_entries` |
| Lend groups | `rift_lend_groups` |
| Trade history | `rift_trades` |
| Settings | `rift_user_settings` |
| Pro access | `rift_entitlements` |
| Billing event log | `rift_billing_events` |

## Catalog tables

| Table | Notes |
| --- | --- |
| `sets` | TCGplayer groups / expansions (`group_id`, `name`) |
| `cards` | One row per **printing**; PK `id` = `"<product_id>-<subtype>"` |
| `card_prices` | Current TCGplayer (USD) + CardMarket (EUR) prices |
| `price_history` | Daily snapshot per card for charts |
| `pipeline_runs` | Ingest log (not client-readable) |
| `app_config` | Remote app config (e.g. update prompts) |
| `cards_with_prices` | View: cards + `set_name` + current prices |

### Key `cards` columns
- `id` — stable per-printing PK; key collections/trades with this
- `product_id` — TCGplayer id (not unique across finishes)
- `name`, `clean_name`, `rarity`, `sub_type_name`, `is_foil`, `is_sealed`
- `collector_number` — e.g. `"147/219"` (OCR scan key)
- `image_url` — TCGplayer CDN card art

## User-data tables (`rift_*`)

Migrations: `20260726143000_rift_cloud_sync_user_data.sql`,
`20260726150000_rift_entitlements_and_billing_events.sql`.

### Sync tables

`rift_binder_entries`, `rift_lend_groups`, `rift_trades`, `rift_user_settings`:

- RLS enabled; policies allow `select` / `insert` / `update` / `delete` only where
  `auth.uid() = user_id` (settings has no delete — reset is an update).
- `updated_at` is client-supplied (last-write-wins merge).
- Deletes are tombstones (`deleted_at`), not row removals.

### Entitlements

| Table | RLS |
| --- | --- |
| `rift_entitlements` | `select` own row only; writes are service-role (Edge Functions) |
| `rift_billing_events` | RLS on, **no** policies — service role only |

## Example queries

### Dart / Flutter

```dart
final supabase = SupabaseClient(
  'https://cnmxaccamqshgvesieez.supabase.co',
  'sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom',
);

final rows = await supabase
    .from('cards_with_prices')
    .select('product_id, name, set_name, image_url, tcg_market, tcg_low')
    .eq('is_sealed', false)
    .ilike('name', '%jinx%')
    .limit(20);
```

### Scan lookup (by collector number)

```dart
final rows = await supabase
    .from('cards_with_prices')
    .select()
    .eq('collector_number', '147/219');
```

## Refresh cadence

The GitHub Action [update-prices.yml](../.github/workflows/update-prices.yml)
runs the ingest daily at 06:00 UTC. See the README under `services/price-pipeline`
to run it manually.
