# RiftTrades

Cross-platform (Android + iOS) Flutter companion for trading **Riftbound**
(Riot Games' League of Legends TCG). Look up prices, balance trades, manage a
binder and want list, lend cards, and scan with the camera.

## Repo layout

| Path | What it is |
| --- | --- |
| `apps/mobile/` | Flutter app (the product) |
| `apps/legal/` | Static Privacy / Terms pages for store review (deploy to Netlify) |
| `services/price-pipeline` | Daily Node ingest: TCGCSV + CardMarket → Supabase |
| `supabase/` | Migrations and Edge Functions for auth, sync, entitlements |
| `docs/` | Architecture, database, environments, entitlements, releasing |

## Run the app

From `apps/mobile`, every build and run needs an env file (no default — missing
flag fails at startup):

```powershell
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/production.json
flutter test --dart-define-from-file=env/production.json
```

Staging (sandbox purchases → fabloodle):

```powershell
flutter run --dart-define-from-file=env/staging.json
```

See [apps/mobile/env/README.md](apps/mobile/env/README.md) and
[docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

## Database

Production Supabase project **fabloodle** (`cnmxaccamqshgvesieez`) holds:

- **Catalog** (unprefixed): `sets`, `cards`, `card_prices`, `price_history`,
  `pipeline_runs`, `app_config`, view `cards_with_prices`
- **User data** (`rift_`-prefixed): binder, lend groups, trades, settings,
  entitlements, billing events

Catalog tables are public read-only via RLS. User-data tables are scoped to
`auth.uid()`. Details: [docs/DATABASE.md](docs/DATABASE.md).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, auth, sync, Pro access
- [docs/DATABASE.md](docs/DATABASE.md) — schema and ownership split
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — production vs staging
- [docs/ENTITLEMENTS.md](docs/ENTITLEMENTS.md) — purchase → Pro path
- [docs/RELEASING.md](docs/RELEASING.md) — `mobile-v*` tag flow
- [docs/APP_STORE_REVIEW.md](docs/APP_STORE_REVIEW.md) — ASC legal URLs + demo account
- [context.md](context.md) — agent handoff / code map

## Free-tier caps

| Cap | Limit | At the cap |
| --- | --- | --- |
| Binder cards | 5 | refuse the add |
| Want-list cards | 4 | refuse the add |
| Loaned cards | 1 | refuse (borrowing uncapped) |
| Saved trades | 3 | trim oldest; never refuse the save |
