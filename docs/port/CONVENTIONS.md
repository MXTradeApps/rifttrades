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
| Production project ref | `tenrvaghaspwdvnwvgrh` |
| Production URL | `https://tenrvaghaspwdvnwvgrh.supabase.co` |
| Production publishable key | `sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr` |
| Staging project ref (`fabloodle`) | `cnmxaccamqshgvesieez` |
| Staging URL | `https://cnmxaccamqshgvesieez.supabase.co` |
| Staging publishable key | **Not in this file — ask for it** |

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

| Cap | Value | Behaviour at the cap |
| --- | --- | --- |
| `binderCards` | 5 | refuse the add |
| `wantListCards` | 4 | refuse the add |
| `loanedCards` | 1 | refuse; borrowing is uncapped |
| `savedTrades` | 3 | trim oldest; never refuse the save |

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

## Do not port these at all

- `packages/contracts/` — golden fixtures pinning web against mobile. RiftTrades
  has no web app.
- `apps/web/`, `netlify.toml` — no web app.
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

**Baseline to protect:** 224 unit tests and 4 integration tests pass today. The
count must only ever go up. If it drops, you broke something — stop and report.

**Edge Functions**, from `C:\Users\maxes\RiftTrades\supabase\functions`:

```powershell
deno fmt --check
deno lint
deno check "**/*.ts"
deno test
```

**Migrations** — the CLI is not installed, so use `npx`:

```powershell
npx supabase migration list
npx supabase db push
```

Never run `npx supabase db pull`, `db diff`, or `db reset` against
`tenrvaghaspwdvnwvgrh`. That project is shared with FAB Trades, and those
commands will pull in or try to drop its tables. Write migrations by hand.

## Migration filenames

Format: `<UTC timestamp>_<snake_case_description>.sql`, e.g.
`20260726143000_rift_cloud_sync_user_data.sql`.

The `supabase_migrations.schema_migrations` table on the shared project holds
versions from **both** repos, so this repo's history will have gaps that belong to
FAB Trades. That is expected. `db push` only applies local versions the remote has
not seen, so it is safe.

No RiftTrades migration may reference a `fab_*` object. A clean local stack only
has this repo's migrations, so such a reference would fail in CI.

## Commit style

One phase, one commit, unless the phase file says otherwise. Subject in the
imperative, under 72 characters, describing the outcome rather than the mechanics.
Each phase file gives you the message to use.
