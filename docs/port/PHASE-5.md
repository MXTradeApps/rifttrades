# Phase 5 — Pro subscriptions and entitlements

Add `RiftTrades Pro`: store purchases via RevenueCat, access recorded server-side
in Postgres, and free-tier caps enforced on the client.

Prerequisites: Phases 3 and 4 are `Done`.

## Read this before you start

**Access is a database row, not a store receipt.** Purchase happens in the App
Store or Play Store, but whether someone *has* Pro is a row in
`rift_entitlements` keyed by their Supabase `user_id`, written only by the service
role from a webhook. Clients can read their own row and nothing else — a client
that could write `is_active` could grant itself Pro.

**Exactly one accessor.** `subscriptionProvider` (device) and
`serverEntitlementProvider` (server) both feed `entitlementProvider`, which feeds
`isProProvider`. Every gate in the app reads `isProProvider`. Nothing else reads
`CustomerInfo` or the entitlement row directly. Do not add a second path.

**Either source grants Pro.** If the device receipt says active, or the server row
says active, the customer gets Pro. Withholding access from someone who paid is
worse than briefly granting it before a refund propagates.

**This phase contains three bug fixes.** The source app has them unfixed. They are
steps 6, 10, and 11. Do not skip them.

## Steps

### 1. Add the dependencies

```yaml
  purchases_flutter: ^10.4.3
  purchases_ui_flutter: ^10.4.3
```

Both must be the same version — they ship in lockstep.

### 2. Copy the client files

| Source | Changes |
| --- | --- |
| `lib/core/models/purchase_outcome.dart` | none |
| `lib/core/models/subscription_status.dart` | brand renames in comments |
| `lib/core/models/entitlement.dart` | brand renames in comments |
| `lib/core/data/entitlement_repository.dart` | `'entitlements'` → `'rift_entitlements'` |
| `lib/core/data/purchases_repository.dart` | brand renames, two message strings |
| `lib/core/config/revenuecat_config.dart` | entitlement id and product ids — see step 3 |
| `lib/core/logic/pro_packages.dart` | brand rename in comment |
| `lib/core/logic/free_limits.dart` | brand rename, and the numbers in step 4 |

### 3. Set the RevenueCat constants

In `lib/core/config/revenuecat_config.dart`:

```dart
  static const proEntitlement = 'RiftTrades Pro';

  static const yearlyProductIds = {
    'com.rifttrades.rifttrades.pro.yearly', // App Store
    'pro_yearly',                           // Play (base plan appended)
    'yearly',                               // Test Store
  };

  static const monthlyProductIds = {
    'com.rifttrades.rifttrades.pro.monthly',
    'pro_monthly',
    'monthly',
  };
```

The App Store ids use the **iOS bundle id** (`com.rifttrades.rifttrades`), not the
Android `applicationId`. They genuinely differ; see `CONVENTIONS.md`.

API keys come from `--dart-define` at build time, never from a committed file. If a
release key is absent, `isConfigured` is false and subscriptions are simply off —
the app must not crash.

### 4. Set the free-tier limits

In `lib/core/logic/free_limits.dart`:

```dart
  static const binderCards = 5;
  static const wantListCards = 4;
  static const loanedCards = 1;
  static const savedTrades = 3;
```

Behaviour: binder, want list, and loaned cards **refuse**; saved trades **trim
oldest** and never refuse the save.

### 5. Copy the paywall UI

| Source | Changes |
| --- | --- |
| `lib/features/paywall/pro_limits.dart` | none — it interpolates the `FreeLimits` constants rather than hardcoding numbers |
| `lib/features/paywall/pro_gate.dart` | brand rename in comment |
| `lib/features/paywall/pro_paywall.dart` | brand renames, three user-facing strings |
| `lib/features/settings/subscription_section.dart` | brand renames, four user-facing strings |

The upsell rule: when a cap blocks an action, show a **snackbar with an Upgrade
action**, not a modal paywall. Someone who tapped "Add to Binder" did not ask to
be sold to. If they do upgrade, retry the action they originally wanted.

Usage counts appear only once a cap is in sight (at 70% or above). A readout at 1
of 5 reads as nagging.

### 6. Wire the providers — and fix the destructive-trim bug

Add to `lib/core/providers.dart`, from the source's lines ~331–531:
`purchasesRepositoryProvider`, `SubscriptionNotifier`, `subscriptionProvider`,
`PurchasesIdentityNotifier`, `purchasesIdentityProvider`,
`entitlementRepositoryProvider`, `serverEntitlementProvider`,
`entitlementProvider`, `isProProvider`, `purchasesAvailableProvider`,
`proOfferingProvider`, `freeUsageProvider`.

Then add this provider, which the source does **not** have:

```dart
/// Whether the customer's Pro state is actually known, as opposed to defaulting
/// to locked while it loads.
///
/// [isProProvider] fails closed, which is correct for hiding a feature and wrong
/// for deleting data. Use this — and only this — to guard destructive trims.
final entitlementResolvedProvider = Provider<bool>((ref) {
  final device = ref.watch(subscriptionProvider);
  final server = ref.watch(serverEntitlementProvider);
  return device.hasValue || server.hasValue;
});
```

Now enforce the caps in the existing notifiers:

- `BinderNotifier._canAddNewCard({required bool isWanted})` — returns true for
  Pro, otherwise counts entries with the matching `isWanted` and compares against
  the cap. Only **new distinct** cards count; raising the quantity of a card
  already there is never capped. `applyTradeConfirm` is **exempt** — trade
  reconciliation is core to the app and must never be blocked.
- `LendNotifier._canLendMore` — counts total **quantity** across non-borrowing
  groups. Borrowing is uncapped.
- `TradeHistoryNotifier.addTrade` — this is the bug fix:

```dart
  int addTrade(Trade trade) {
    final all = [trade, ...state];
    // Never trim while the entitlement is still unknown. A Pro customer with no
    // signal would otherwise have their history cut, and _persist() turns those
    // drops into tombstones that sync outward to every other device.
    if (ref.read(isProProvider) ||
        !ref.read(entitlementResolvedProvider) ||
        all.length <= FreeLimits.savedTrades) {
      state = all;
      _persist();
      return 0;
    }
    state = all.take(FreeLimits.savedTrades).toList();
    _persist();
    return all.length - FreeLimits.savedTrades;
  }
```

Write a test that fails without the `entitlementResolvedProvider` clause: a
container where both the device and server entitlement error, holding more than
three trades, asserting that adding a trade trims **nothing**.

### 7. Restore the identity watch in `SyncHost`

Add back the `ref.watch(purchasesIdentityProvider)` you removed in Phase 4. It
exists for its side effect: binding RevenueCat's `app_user_id` to the Supabase
user id.

This binding is the linchpin. A purchase made while anonymous gets a
`$RCAnonymousID:…` id, which can never be attributed to an account, so the server
can never grant it. Gate the paywall behind sign-in and await the bind before
presenting it.

### 8. Configure RevenueCat in `main.dart`

Add before `runApp`, matching the source's `main.dart`:

```dart
  final purchases = PurchasesRepository();
  await purchases.configure();
```

and override `purchasesRepositoryProvider` in the `ProviderScope`. `configure()`
must never throw — no key means no subscriptions, not a crash.

### 9. Write the entitlements migration

Create `supabase/migrations/<timestamp>_rift_entitlements_and_billing_events.sql`.

```sql
-- Server-owned record of who has RiftTrades Pro.
--
-- Written only by the service role, from the Edge Functions. A client that could
-- write `is_active` could grant itself Pro, so clients get select on their own
-- row and nothing else.

create table if not exists public.rift_entitlements (
  user_id         uuid primary key references auth.users on delete cascade,
  tier            text        not null default 'free' check (tier in ('free','pro')),
  is_active       boolean     not null default false,
  is_trialing     boolean     not null default false,
  in_grace_period boolean     not null default false,
  source          text        check (source in ('app_store','play_store','stripe','promo')),
  product_id      text,
  expires_at      timestamptz,
  is_sandbox      boolean     not null default false,
  rc_customer_id  text,
  updated_at      timestamptz not null default now()
);

alter table public.rift_entitlements enable row level security;

create policy "Users can view own rift_entitlement"
  on public.rift_entitlements for select using (auth.uid() = user_id);

-- Partial index for the nightly sweep, which only looks at active rows near
-- their expiry.
create index if not exists rift_entitlements_expires_at_idx
  on public.rift_entitlements (expires_at) where is_active;

-- Idempotency ledger and dispute audit trail. No client ever reads this, so it
-- gets RLS with no policy at all: service role only.
create table if not exists public.rift_billing_events (
  id          text primary key,
  provider    text        not null default 'revenuecat',
  app_user_id uuid,
  payload     jsonb       not null,
  received_at timestamptz not null default now()
);

alter table public.rift_billing_events enable row level security;

create index if not exists rift_billing_events_app_user_id_received_at_idx
  on public.rift_billing_events (app_user_id, received_at desc);
```

`app_user_id` deliberately has **no** foreign key — events arrive for anonymous
and deleted users and must still be recorded.

Apply to both projects as in Phase 4 step 2, and relink to production afterwards.

### 10. Copy the Edge Functions — and fix the sandbox bug

Copy `e:\Downlaods\Downloads\fabtrades\supabase\functions\` to
`C:\Users\maxes\RiftTrades\supabase\functions\`: `_shared/` (`http.ts`,
`revenuecat.ts`, `entitlement.ts`), `revenuecat-webhook/`,
`reconcile-entitlements/`, `deno.json`, and all the test files.

Changes:

- Table names: `entitlements` → `rift_entitlements`,
  `billing_events` → `rift_billing_events`. Read these from environment variables
  rather than hardcoding, so the code stays close to the source's.
- Default entitlement id: `FABTrades Pro` → `RiftTrades Pro`.
- Re-add the `[functions.revenuecat-webhook]` and
  `[functions.reconcile-entitlements]` sections to `supabase/config.toml`, both
  with `verify_jwt = false`. These endpoints authenticate with a shared secret,
  not a user JWT.

**The fix:** in `reconcile-entitlements/index.ts` at around line 78, the source
reads:

```typescript
      fetchSubscriber: (appUserId) => fetchSubscriber(appUserId, apiKey),
```

RevenueCat omits sandbox transactions from `GET /subscribers` unless asked, so
every sandbox tester's row reads back as "no purchase" and gets revoked at 05:00
UTC. The webhook passes the flag; the reconciler must too. `is_sandbox` is already
on the row, so pass it through:

```typescript
      fetchSubscriber: (appUserId, isSandbox) =>
        fetchSubscriber(appUserId, apiKey, isSandbox),
```

and thread `row.is_sandbox` into that call from `reconcile.ts`. Add a test named
for the behaviour — the webhook suite has one and the reconcile suite does not,
which is how this was missed.

### 11. Fix the concurrent-webhook race

Two deliveries racing can leave a paying customer inactive with no way back,
because the nightly sweep filters `.eq('is_active', true)` and so cannot see a
wrongly-inactive row.

Two changes:

**a. Make the write conditional.** Capture a timestamp immediately *before*
calling `fetchSubscriber`, and pass it to `saveEntitlement`. In the store:

1. `update` the row `where user_id = ? and updated_at <= readAt`, with `.select()`
   so you can tell whether it matched.
2. If it matched, done.
3. If it did not match, check whether a row exists. If none, `insert`. If one
   exists with `updated_at > readAt`, a newer write already landed — skip, and log
   that you skipped.

**b. Let the sweep see recently-deactivated rows.** In `reconcile.ts`, widen the
query from active-only to also include rows deactivated within the grace window,
so a wrongly-inactive row gets repaired the same night.

Add a test for each: two out-of-order writes leaving the row active, and a
deactivated row inside the window being picked up by the sweep.

### 12. Add the nightly reconcile workflow

Create `.github/workflows/reconcile-entitlements.yml`: cron `0 5 * * *` UTC plus
`workflow_dispatch`, POSTing to
`${SUPABASE_FUNCTIONS_URL}/reconcile-entitlements` with
`Authorization: Bearer ${RECONCILE_SECRET}`. Fail the job on any non-200. Model it
on the source repo's file of the same name.

### 13. Copy the tests

| Source |
| --- |
| `test/core/models/entitlement_test.dart` |
| `test/core/models/subscription_status_test.dart` |
| `test/core/logic/pro_packages_test.dart` |
| `test/core/providers/free_limits_test.dart` |
| `test/core/purchases_identity_test.dart` |
| `test/widgets/subscription_section_test.dart` |

Do **not** copy `test/contracts/free_limits_contract_test.dart` — it reads
`packages/contracts/free_limits.json`, which this repo does not have and is not
getting. Move any assertions worth keeping into `free_limits_test.dart`.

Update the expected numbers to 5 / 4 / 1 / 3 and the entitlement id to
`RiftTrades Pro` throughout.

## Verify

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

From `C:\Users\maxes\RiftTrades\supabase\functions`:

```powershell
deno fmt --check
deno lint
deno check "**/*.ts"
deno test
```

Checks:

- [ ] `flutter analyze` clean; Deno all four clean
- [ ] Flutter test count up; Deno tests all pass
- [ ] No bare entitlement table anywhere:

```powershell
Select-String -Path lib,..\..\supabase -Include *.dart,*.ts -Pattern "'entitlements'|'billing_events'"
```

  Must return nothing.

- [ ] No FAB brand string reaches the UI:

```powershell
Select-String -Path lib -Include *.dart -Pattern "FABTrades|fabtrades"
```

  Must return nothing.

- [ ] The three fixes are real, each proven by a test that fails without it:
  - trim does not run while the entitlement is unresolved
  - the reconciler asks for sandbox data
  - an out-of-order webhook write does not deactivate an active row

### Manual check — needs a human

Blocked until someone has created the RevenueCat project, products, and
`RiftTrades Pro` entitlement, and set the Supabase function secrets
(`REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY`, `RECONCILE_SECRET`). If not
done, report it as blocked.

Debug builds use the RevenueCat Test Store, so **store misconfiguration only
shows up in a release build.** Verify in a release build against staging:

1. The paywall loads with real prices on both platforms.
2. A sandbox purchase unlocks Pro on the device.
3. A row appears in `rift_entitlements` for that user.
4. Signing in on a second device shows Pro without purchasing again.
5. The nightly job does **not** revoke the sandbox purchase. This is fix 10; run
   the workflow manually and re-check the row.

## Commit

Split this phase into two commits:

```powershell
git commit -m "Add server-owned entitlements for RiftTrades Pro"
git commit -m "Gate Pro through one accessor and cap the free tier"
```

Set Phase 5 to `Done` in `docs/port/README.md`.
