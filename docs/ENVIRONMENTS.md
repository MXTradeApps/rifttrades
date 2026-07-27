# Environments

Two environments, **production** and **staging**, and one rule: no build decides
which one it is at runtime. Every client is told at build time, and a build that
is not told fails immediately rather than defaulting to production.

That rule exists because of subscriptions. A sandbox purchase in a test build
must not write a real entitlement, and the only reliable way to guarantee that
is for the test build to be physically unable to reach the production database.

## Which project is which

| | Production | Staging |
| --- | --- | --- |
| Supabase | `tenrvaghaspwdvnwvgrh` (RiftTrades) | `cnmxaccamqshgvesieez` (**fabloodle**) |
| Mobile env file | `apps/mobile/env/production.json` | `apps/mobile/env/staging.json` |

Staging reuses the existing **fabloodle** Supabase project rather than a paid
persistent branch of production. Apply the same RiftTrades migrations and Edge
Functions there so sandbox purchases write entitlement rows without another
billable database. Schema drift between the two projects is possible — apply
migrations to both when they change.

## How the mobile app is told

`--dart-define-from-file`, one file per environment in `apps/mobile/env`:

```powershell
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/staging.json
```

There is no default. `SupabaseConfig.assertConfigured()` runs before anything
touches the network and throws with instructions, so a forgotten flag is a
startup failure rather than a support ticket about missing data.

Outside production, Settings shows a "Test build" row naming the environment.

Publishable keys in those files are committed deliberately: they are public by
design, gated by RLS. RevenueCat API keys come from CI secrets; a build without
one runs with subscriptions switched off.

## Applying schema and functions to staging

Point the CLI at fabloodle, apply migrations, set secrets, deploy functions:

```powershell
npx supabase login
npx supabase link --project-ref cnmxaccamqshgvesieez
# Apply this repo's migration SQL by hand (db push is unreliable on the shared project)
npx supabase secrets set `
  REVENUECAT_WEBHOOK_SECRET=<any long random string> `
  RECONCILE_SECRET=<a different long random string> `
  REVENUECAT_API_KEY=sk_<secret key from RevenueCat> `
  REVENUECAT_ENTITLEMENT_ID='RiftTrades Pro'
npx supabase functions deploy revenuecat-webhook
npx supabase functions deploy reconcile-entitlements
```

In RevenueCat → **Integrations → Webhooks**, add a sandbox webhook pointing at:

`https://cnmxaccamqshgvesieez.supabase.co/functions/v1/revenuecat-webhook`

Keep the production webhook on `tenrvaghaspwdvnwvgrh` so live purchases never
hit fabloodle.

Card catalog data is not shared automatically. Run the price ingest once against
fabloodle if a staging build needs a usable binder; purchase-flow testing only
needs auth + the entitlements tables.

Auth providers on fabloodle need the same Apple / Google / Discord setup as
production, plus `rifttrades://login-callback` in the redirect allow-list.

## Price ingest

Already environment-driven: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, from
GitHub secrets in CI or a local `.env` under `services/price-pipeline`. That
file holds a real secret — never appear in a client build or this repository's
tracked files.

## Release builds

| Build | Environment |
| --- | --- |
| Android release workflow | `environment` input, default `production` |
| iOS (Codemagic) | `APP_ENVIRONMENT`, default `production` |

Use staging for anything exercising purchases. Sandbox transactions on both
stores are indistinguishable from real ones as far as the app is concerned; the
database they land in is the only boundary that holds.
