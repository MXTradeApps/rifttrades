# Phase 14 — Account deletion and subscription management

Port the FAB Trades commit `c666607e` ("acc delete, sub changes"): in-app
account deletion (Apple 5.1.1(v) / Play requirement), a Manage Subscription
screen for plan changes and store cancellation, and the supporting config /
edge function.

Prerequisite: Phase 5 is `Done` (entitlements + RevenueCat wiring exist).

Source repo on this machine: `/Users/joseescaler/Documents/fabtrades`
(CONVENTIONS.md's Windows path is the same content). Target is this repo's
`apps/mobile` and `supabase/`.

Read `CONVENTIONS.md` first. Apply brand renames on every copied file. RiftTrades
has **no** PostHog / `analytics` module — strip every `Analytics`,
`analyticsProvider`, and `capture` / `captureException` call from the source.
Do not invent an analytics stub.

## Do not copy

| Source | Why |
| --- | --- |
| `supabase/migrations/20260806101534_trades_on_delete_cascade.sql` | RiftTrades `rift_trades` (and every other `rift_*` user table) already has `ON DELETE CASCADE` on `user_id`. Adding FAB's unprefixed `trades` migration would be wrong and unsafe. |
| Screenshot / `.aso` assets | Not part of this feature. |
| Any Analytics / PostHog import or call | RiftTrades has no analytics package yet. |

## Steps

### 1. Edge function `delete-account`

Copy
`/Users/joseescaler/Documents/fabtrades/supabase/functions/delete-account/index.ts`
to `supabase/functions/delete-account/index.ts`.

In the file header comment, name the RiftTrades tables that cascade
(`rift_binder_entries`, `rift_lend_groups`, `rift_user_settings`,
`rift_binder_shares`, `rift_entitlements`, `rift_trades`) instead of FAB's
unprefixed names. Keep the shared `json` import from `../_shared/http.ts`
(already present in this repo).

Do **not** add a migration for trades cascade.

Deploy is a human task after Verify — do not deploy from this phase.

### 2. `AuthRepository` takes `SupabaseClient` + `deleteAccount`

Surgically edit (do not overwrite wholesale):

- `apps/mobile/lib/core/data/auth_repository.dart`
- `apps/mobile/lib/core/providers.dart` (`authRepositoryProvider`)
- `apps/mobile/test/core/data/auth_repository_test.dart`

Mirror the FAB change:

- Constructor takes `SupabaseClient _client`; `_auth` is `_client.auth`.
- Add `deleteAccount()` and the `DeleteAccountOutcome` sealed types exactly as
  in FAB, **except** omit the `Analytics().captureException(...)` line in the
  catch — keep `debugPrint` only.
- Provider: `AuthRepository(ref.watch(supabaseClientProvider))`.
- Test harness: mock `SupabaseClient`, stub `.auth` to the existing
  `GoTrueClient` mock, construct `AuthRepository(client)`.

### 3. Product helpers on `RevenueCatConfig`

In `apps/mobile/lib/core/config/revenuecat_config.dart`, add
`isMonthlyProduct`, `isYearlyProduct`, and private `_matchesProduct` from FAB
(match Play's `id:base_plan` prefix form). Keep the existing RiftTrades product
id sets (including any already-present `pro.yearly` / `pro.monthly` Test Store
ids — do not revert those).

Copy and adapt
`apps/mobile/test/core/config/revenuecat_config_test.dart` from FAB with
`package:rifttrades/` and RiftTrades product ids in the assertions
(`com.rifttrades.app.pro.monthly` / `.yearly`, `pro_monthly:default`,
`pro_yearly:default`, plus Test Store `monthly` / `yearly`).

### 4. `Entitlement.store` + `canManageInStore`

Surgically edit `apps/mobile/lib/core/models/entitlement.dart` to match FAB:

- Import `Store` from `purchases_flutter`.
- Add `store` field; pass `device.store` through `Entitlement.resolve`.
- Add `canManageInStore` getter.
- Include `store` in `==` / `hashCode`.

Update `apps/mobile/test/core/models/entitlement_test.dart` only if equality or
resolve assertions break — `SubscriptionStatus` already carries `store`.

### 5. Manage subscription screen + wire My Account

Copy from FAB (apply package + brand renames; **strip all analytics**):

| Source | Target |
| --- | --- |
| `lib/features/settings/manage_subscription_screen.dart` | same path under `apps/mobile/` |
| `lib/features/settings/delete_account_section.dart` | same path under `apps/mobile/` |

Brand strings that must become RiftTrades:

- `FABTrades Pro` → `RiftTrades Pro`
- `FAB Trades account` → `RiftTrades account`

Wire surgically:

- `account_screen.dart` — import and append `DeleteAccountSection()` after
  `SubscriptionSection()` (same order as FAB).
- `subscription_section.dart` — change `_ProStatusCard` to `StatelessWidget`
  (drop unused `WidgetRef`); "Manage subscription" navigates to
  `ManageSubscriptionScreen` instead of `presentProCustomerCenter` (keep the
  Customer Center entry on the manage screen's Help tile via
  `presentProCustomerCenter`).

### 6. Widget tests

Copy / adapt from FAB:

- `test/widgets/delete_account_section_test.dart` — `package:rifttrades/`, use
  existing `../support/harness.dart` + `../support/sync_stub.dart`. No
  analytics overrides.
- `test/widgets/subscription_section_test.dart` — add `store: Store.appStore`
  on Pro fixtures that expect Manage subscription; add the FAB test that opens
  Manage subscription and expects "Switch to monthly", "Cancel subscription",
  "Get help". Import `purchases_flutter` for `Store`.

### 7. Privacy policy copy

In `apps/legal/privacy/index.html`, update the retention bullet that currently
says to email for account deletion so it also mentions in-app Delete account
(type DELETE), matching FAB's privacy wording with RiftTrades branding. Do not
rewrite the rest of the page.

## Verify

Working directory: `apps/mobile`.

```sh
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

From `supabase/functions`:

```sh
deno fmt --check
deno lint
deno check "**/*.ts"
deno test
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count did not drop (new config + delete-account + manage-subscription
      cases should raise it)
- [ ] No `fabtrades` / `FABTrades` / `FAB Trades` in new or edited Dart under
      `apps/mobile/lib/`
- [ ] No Analytics / PostHog imports in the new settings files or
      `auth_repository.dart`
- [ ] No new migration that touches unprefixed `trades` or any `fab_*` object
- [ ] `delete-account` edge function present; header comment names `rift_*`
      tables
- [ ] Privacy policy mentions in-app Delete account

## Commit

```sh
git add -A
git commit -m "Add in-app account deletion and subscription management"
```

Set Phase 14 to `Done` in `docs/port/README.md` in the same commit.

## Human follow-up (not blocking the commit)

Deploy the edge function to both Supabase projects after Verify:

```sh
npx supabase functions deploy delete-account --project-ref <fabloodle-or-staging>
```
