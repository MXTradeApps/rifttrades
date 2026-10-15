# Environments

Two environments, **production** and **staging**, and one rule: no build decides
which one it is at runtime. Every client is told at build time, and a build that
is not told fails immediately rather than defaulting to production.

That rule exists because of subscriptions. A sandbox purchase in a test build
must not write a real entitlement, and the only reliable way to guarantee that
is for the test build to be physically unable to reach the production database.

## Which project is which

| | Production | Staging (interim) |
| --- | --- | --- |
| Supabase | `cnmxaccamqshgvesieez` (**fabloodle**) | `tenrvaghaspwdvnwvgrh` (former RiftTrades / FAB host) |
| Mobile env file | `apps/mobile/env/production.json` | `apps/mobile/env/staging.json` |

**Intended staging** is the paused **fabtools** project (`akpgocviouxipfckqomv`).
Restoring it is blocked on the free plan while two other projects are already
active. Until fabtools is restored, staging uses the former production project
so sandbox purchases never hit fabloodle. That interim project is also FAB
Trades' production auth host — keep sandbox webhooks on `rift_*` tables only.

### Cutover checklist (fabloodle production)

Done in the July 2026 migration:

- [x] Catalog ingested into fabloodle; `app_config` seeded
- [x] `apps/mobile/env/production.json` → fabloodle
- [x] GitHub secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `SUPABASE_FUNCTIONS_URL` → fabloodle
- [x] RevenueCat production webhook → fabloodle; sandbox → interim staging
- [x] `rifttrades://login-callback` on fabloodle auth redirect allow-list
      (Apple / Google / Discord already enabled)

Still manual / follow-up:

- [ ] Confirm OAuth client redirect URIs (Google / Discord / Apple) include
      fabloodle's callback host if providers were configured only for the old project
- [ ] Restore **fabtools** for dedicated staging (below)
- [ ] Optional: remove leftover Riftbound catalog / `rift_*` tables from
      `tenrvaghaspwdvnwvgrh` once nothing RiftTrades-related points there

### Restoring fabtools (target staging)

1. Free an active project slot (pause/delete something unused) **or** upgrade the org.
2. Restore `akpgocviouxipfckqomv` in the Supabase dashboard / MCP.
3. Apply this repo's three migrations (SQL + `schema_migrations` rows).
4. Set secrets and deploy `revenuecat-webhook` + `reconcile-entitlements`.
5. Point `apps/mobile/env/staging.json` at fabtools' URL + publishable key.
6. Move the RevenueCat **sandbox** webhook to
   `https://akpgocviouxipfckqomv.supabase.co/functions/v1/revenuecat-webhook`.

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

## Applying schema and functions to a non-production project

```powershell
npx supabase login
npx supabase link --project-ref <staging-ref>
# Apply this repo's migration SQL by hand if db push is unreliable
npx supabase secrets set `
  REVENUECAT_WEBHOOK_SECRET=<any long random string> `
  RECONCILE_SECRET=<a different long random string> `
  REVENUECAT_API_KEY=sk_<secret key from RevenueCat> `
  REVENUECAT_ENTITLEMENT_ID='RiftTrades Pro'
npx supabase functions deploy revenuecat-webhook
npx supabase functions deploy reconcile-entitlements
```

### RevenueCat webhooks

| Traffic | Target |
| --- | --- |
| Production (live) | `https://cnmxaccamqshgvesieez.supabase.co/functions/v1/revenuecat-webhook` |
| Sandbox (interim staging) | `https://tenrvaghaspwdvnwvgrh.supabase.co/functions/v1/revenuecat-webhook` |

After fabtools is restored, move the sandbox webhook to that project.

Auth providers on fabloodle need Apple / Google / Discord, plus
`rifttrades://login-callback` in the redirect allow-list. Same for whatever
project staging uses.

## Price ingest

Already environment-driven: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, from
GitHub secrets in CI or a local `.env` under `services/price-pipeline`. Those
secrets must point at **fabloodle** (production). That file holds a real secret —
never appear in a client build or this repository's tracked files.

## Release builds

| Build | Environment |
| --- | --- |
| Android release workflow | `environment` input, default `production` |
| iOS (local Xcode / `flutter build ipa`) | `--dart-define-from-file=env/<name>.json`, use `production` for TestFlight |

Use staging for anything exercising purchases. Sandbox transactions on both
stores are indistinguishable from real ones as far as the app is concerned; the
database they land in is the only boundary that holds.
