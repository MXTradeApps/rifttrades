# Conventions and constants

Read this fully before your first phase. Everything you need to substitute is
here. **If a value you need is not in this file, stop and ask.** Do not guess a
project ref, key, product id, or secret.

## Paths

| Name | Path |
| --- | --- |
| Target repo (write here) | `C:\Users\maxes\RiftTrades` |
| Target Flutter app | `C:\Users\maxes\RiftTrades\apps\mobile` (after Phase 0; `app` before) |
| Source repo (**read only — never write**) | `e:\Downlaods\Downloads\fabtrades` |
| Source Flutter app | `e:\Downlaods\Downloads\fabtrades\apps\mobile` |

On the Mac used for Phases 10–13 the same repos live at
`/Users/joseescaler/Documents/rifttrades` (this monorepo),
`/Users/joseescaler/Documents/fabtrades` (source), and
`/Users/joseescaler/Documents/riftrades` (web app). Web paths, table renames, and
copy rules are in [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md) — do not invent a
web tree under `apps/web/` here.

## Constants

| Thing | Value |
| --- | --- |
| Dart package name | `rifttrades` |
| Root app widget | `RiftTradesApp` |
| Product name in UI copy | `RiftTrades` |
| Pro tier name in UI copy | `RiftTrades Pro` |
| Deep-link scheme | `rifttrades` |
| Deep-link redirect URL | `rifttrades://login-callback` |
| Android `applicationId` | `com.rifttrades.myapp` (published — **cannot change**) |
| Android Gradle namespace | `com.rifttrades.rifttrades` |
| iOS bundle id | `com.rifttrades.rifttrades` |
| Release tag pattern | `mobile-v*` |

The Android id and iOS bundle id genuinely differ. That is not a typo to fix.

### Supabase

| Thing | Value |
| --- | --- |
| Production project ref (`fabloodle`) | `cnmxaccamqshgvesieez` |
| Production URL | `https://cnmxaccamqshgvesieez.supabase.co` |
| Production publishable key | `sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom` |
| Staging (interim) project ref | `tenrvaghaspwdvnwvgrh` |
| Staging (interim) URL | `https://tenrvaghaspwdvnwvgrh.supabase.co` |
| Staging (intended) project ref (`fabtools`, paused) | `akpgocviouxipfckqomv` |

### RevenueCat

| Thing | Value |
| --- | --- |
| Entitlement id | `RiftTrades Pro` |
| App Store product ids | `com.rifttrades.rifttrades.pro.yearly`, `com.rifttrades.rifttrades.pro.monthly` |
| Play product ids | `pro_yearly`, `pro_monthly` |
| Play base plans | `annual-autorenewing`, `monthly-autorenewing` |
| Test Store product ids | `yearly`, `monthly` |
| API keys | **Not in this file — ask for them** |

### Free-tier limits

Must stay in lockstep with the web app (see
[`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md)). Mobile currently ships:

| Cap | Value | Behaviour at the cap |
| --- | --- | --- |
| `binderCards` | 50 | refuse the add |
| `wantListCards` | 25 | refuse the add |
| `loanedCards` | 25 | refuse; borrowing is uncapped |
| `savedTrades` | 3 | trim oldest; never refuse the save |

Note: [`PHASE-13.md`](PHASE-13.md) and the web conventions table still describe
a planned **50 / 50** binder/want parity (with `loanedCards` at 1). Mobile's
live numbers above came from a separate mainline change — reconcile web and
Phase 13 against these before treating Phase 13 as done.

### Pro-only features

| Feature | Behaviour |
| --- | --- |
| Find Trade Filler | Hard gate via `ensurePro` before the sheet opens |

## Database table names

RiftTrades owns the **unprefixed catalog** tables and **`rift_`-prefixed user
data** tables. FAB Trades owns `fab_`-prefixed catalog tables and the
**unprefixed user-data** tables. This asymmetry is deliberate and is explained in
`../PORT_PLAN.md`. Get it wrong and you write Riftbound cards into Flesh and
Blood users' binders.

| Purpose | FAB Trades table (source) | RiftTrades table (what you write) |
| --- | --- | --- |
| Binder + want list | `binder_entries` | `rift_binder_entries` |
| Lend groups | `lend_groups` | `rift_lend_groups` |
| Trade history | `trades` | `rift_trades` |
| Settings | `user_settings` | `rift_user_settings` |
| Pro access | `entitlements` | `rift_entitlements` |
| Billing event log | `billing_events` | `rift_billing_events` |

Already existing and **not** to be touched or recreated: `sets`, `cards`,
`card_prices`, `price_history`, `pipeline_runs`, `app_config`, and the
`cards_with_prices` view.

## Never change these

These look like table names but are not. Renaming any of them destroys existing
users' local data or corrupts the sync journal.

| Where | Literal | What it actually is |
| --- | --- | --- |
| `lib/core/data/binder_repository.dart` | `'collection_entries'` | SharedPreferences key |
| `lib/core/data/lend_repository.dart` | `'lend_groups'` | SharedPreferences key |
| `lib/core/data/trade_repository.dart` | `'saved_trades'` | SharedPreferences key |
| `lib/core/data/settings_repository.dart` | `'app_settings'` | SharedPreferences key |
| `lib/core/sync/sync_journal.dart` | `trades('trades')` and siblings | `SyncDomain` enum journal keys |
| `lib/core/sync/sync_journal.dart` | `'sync_journal_v1'` | SharedPreferences key |
| `lib/core/data/catalog_repository.dart` | `'card_catalog'` | SharedPreferences key |
| `lib/core/update/app_update_checker.dart` | `'dismissed_app_update_version'` | SharedPreferences key |

`lend_repository.dart`'s `'lend_groups'` and the `rift_lend_groups` table sharing
a root name is a coincidence. The repository one is a local storage key and stays
exactly as it is.

## Rename rules for copied code

Apply these to every file you copy from the source repo.

| Find | Replace with |
| --- | --- |
| `package:fabtrades/` | `package:rifttrades/` |
| `FabTradesApp` | `RiftTradesApp` |
| `FABTrades Pro` | `RiftTrades Pro` |
| `FABTrades` | `RiftTrades` |
| `FAB Trades` | `RiftTrades` |
| `'fabtrades'` (the deep-link scheme) | `'rifttrades'` |
| `fabtrades://` | `rifttrades://` |
| `com.fabtrades.app.pro.` | `com.rifttrades.rifttrades.pro.` |

Do **not** apply these blindly with a find-and-replace across the repo. Apply
them per file, as you copy it. In particular, `fabtrades.net` appears in the
source's `theme.dart` and is a website reference, not a name to translate — and
you are not copying `theme.dart` at all.

## Which files are safe to copy verbatim

**Copy verbatim, then apply only the import rename.** These 14 files contain no
FAB-specific values:

```
lib/app/card_filter_bar.dart
lib/app/fallback_network_image.dart
lib/app/printing_picker.dart
lib/core/data/cached_collection.dart
lib/core/logic/set_abbreviation.dart
lib/core/models/account.dart
lib/core/models/purchase_outcome.dart
lib/core/sync/collection_sync.dart
lib/core/sync/sync_adapter.dart
lib/core/sync/sync_record.dart
lib/features/auth/auth_provider_icons.dart
lib/features/paywall/pro_limits.dart
lib/features/settings/account_screen.dart
lib/features/sync/sync_host.dart
```

**Copy, then change exactly one table-name string.** The line numbers are from
the source file and may shift by a line or two:

| File | Line | Change |
| --- | --- | --- |
| `lib/core/sync/binder_sync.dart` | ~22 | `'binder_entries'` → `'rift_binder_entries'` |
| `lib/core/sync/lend_sync.dart` | ~20 | `'lend_groups'` → `'rift_lend_groups'` |
| `lib/core/sync/trade_sync.dart` | ~21 | `'trades'` → `'rift_trades'` |
| `lib/core/data/entitlement_repository.dart` | ~22 | `'entitlements'` → `'rift_entitlements'` |
| `lib/core/sync/remote_store.dart` | ~86, ~98 | `'user_settings'` → `'rift_user_settings'` (two places) |

**Copy, then apply the brand renames.** These carry `FABTrades` in comments, user-
facing strings, or constants:

```
lib/core/config/auth_config.dart          scheme constant + comment
lib/core/config/revenuecat_config.dart    entitlement id + product ids + comments
lib/core/data/purchases_repository.dart   two message strings
lib/core/logic/free_limits.dart           doc comment (and the cap numbers above)
lib/core/logic/pro_packages.dart          doc comment
lib/core/models/entitlement.dart          doc comment
lib/core/models/subscription_status.dart  doc comment
lib/features/paywall/pro_gate.dart        doc comment
lib/features/paywall/pro_paywall.dart     three user-facing strings
lib/features/settings/subscription_section.dart  four user-facing strings
```

**Never copy wholesale — these already exist here and have diverged.** Edit the
RiftTrades version by hand, adding only what the phase file tells you to:

```
lib/main.dart               lib/app/app.dart          lib/app/theme.dart
lib/core/providers.dart     lib/app/widgets.dart      lib/core/models/card_model.dart
lib/core/data/card_repository.dart                    lib/core/config/supabase_config.dart
lib/core/data/binder_repository.dart                  lib/core/data/lend_repository.dart
lib/core/data/trade_repository.dart                   lib/core/data/settings_repository.dart
lib/features/settings/settings_screen.dart
lib/features/binder/binder_screen.dart                lib/features/trade/trade_screen.dart
lib/features/card_detail/card_detail_screen.dart      lib/features/search/search_screen.dart
```

The two apps' shared files differ by about 3,564 lines because Riftbound is not
Flesh and Blood. Copying any file in this last list over the RiftTrades version
will destroy working behaviour.

## Do not port these at all (into the mobile monorepo)

- `packages/contracts/` — golden fixtures pinning FAB web against FAB mobile.
  Do not add this package under the mobile monorepo. Web free-limit numbers are
  defined inline in the web repo (see [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md)).
- `apps/web/`, `netlify.toml` from FAB Trades — do **not** create `apps/web`
  here. The RiftTrades web app is a separate repository
  (`/Users/joseescaler/Documents/riftrades`). Port web work via Phases 10–12 and
  [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md), not by copying FAB's monorepo layout
  into this repo.
- `lib/core/data/app_update_repository.dart`, `lib/core/models/app_update_config.dart`,
  `lib/core/logic/version_compare.dart`, `lib/features/update/update_prompt.dart` —
  RiftTrades already has a working equivalent in `lib/core/update/`,
  `lib/core/logic/app_version.dart`, `lib/core/models/app_config.dart`, and
  `lib/core/data/app_config_repository.dart`. **Leave the RiftTrades ones alone.**

## Verification commands

Run from `C:\Users\maxes\RiftTrades\apps\mobile` (or `app` before Phase 0).

**Before Phase 2:**

```powershell
flutter analyze
flutter test
```

**From Phase 2 onward** — the env flag is required or the app throws at startup:

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

**Baseline to protect:** 404 unit tests and 4 integration tests pass today. The
count must only ever go up. If it drops, you broke something — stop and report.

**Edge Functions**, from `C:\Users\maxes\RiftTrades\supabase\functions`:

```powershell
deno fmt --check
deno lint
deno check "**/*.ts"
deno test
```

**Baseline to protect:** 59 tests pass today, and `fmt --check`, `lint`, and
`check` are clean. The count must only ever go up. If a command fails or the
count drops, you broke something — stop and report.

**Migrations** — the CLI is not installed, so use `npx`:

```powershell
npx supabase migration list
```

`db push` does not work from this repo: the shared project has FAB Trades
migration versions that will never have files here, so the CLI aborts before
applying anything. Apply a migration by running its SQL against the database
(SQL editor or Supabase MCP `execute_sql`), then record the version by hand:

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('<version>', '<name>');
```

Never run `npx supabase db pull`, `db diff`, or `db reset` against the interim
staging project `tenrvaghaspwdvnwvgrh` — that database still hosts FAB Trades
tables. Prefer linking and working against fabloodle (`cnmxaccamqshgvesieez`).
Write migrations by hand when `db push` is blocked by foreign migration history.

## Migration filenames

Format: `<UTC timestamp>_<snake_case_description>.sql`, e.g.
`20260726143000_rift_cloud_sync_user_data.sql`.

fabloodle may still carry migration versions from earlier tenants. If `db push`
refuses, apply migrations by executing their SQL, then inserting the version row
into `supabase_migrations.schema_migrations` by hand.

No RiftTrades migration may reference a `fab_*` object. A clean local stack only
has this repo's migrations, so such a reference would fail in CI. Keep new
user-data tables `rift_`-prefixed — fabloodle still has leftover unprefixed /
`fab_*` tables.

## Commit style

One phase, one commit, unless the phase file says otherwise. Subject in the
imperative, under 72 characters, describing the outcome rather than the mechanics.
Each phase file gives you the message to use.
