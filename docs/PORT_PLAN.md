# Porting the FAB Trades platform work into RiftTrades

FAB Trades gained Supabase Auth, cloud sync, and a paid Pro tier, and was
restructured into a monorepo along the way. This plan recreates that work here.

It is written against the two repos side by side on this machine:

| | Path |
| --- | --- |
| Source | `e:\Downlaods\Downloads\fabtrades` (Flutter app at `apps/mobile`) |
| Target | `C:\Users\maxes\RiftTrades` (Flutter app at `app`, becoming `apps/mobile` in Phase 0) |

## How to use this document

This is the **reasoning** half of the port: the decisions, the alternatives that
were rejected, the bugs being inherited, and the risks. Read it to understand
*why* the port is shaped the way it is.

The **execution** half is [`port/`](port/) — one file per phase, with exact
commands, exact file mappings, and verification steps. If you are here to do the
work, start at [`port/README.md`](port/README.md) and read
[`port/CONVENTIONS.md`](port/CONVENTIONS.md) before your first phase.

Where this document and a phase file disagree, **the phase file wins** — it is
the one that gets corrected as the work lands.

## What is being ported

24 commits, starting at `86a4d723`. The bulk of it is one 12-commit refactor
(414 files, +13,913/−708 — though 240 of those files are pure renames from the
monorepo move, leaving 118 files of real content), followed by 12 smaller
commits that tightened limits, wired staging, and reworked the sign-in and
account UI.

In FAB Trades' own order, oldest first:

```
86a4d723 Add FABTrades Pro subscriptions via RevenueCat
bf78faed Restructure into an apps/services monorepo
8e6981cc Put the Supabase schema under version control
aafc39bd Add CI and enforce the web/mobile logic contracts
850d1536 Add Supabase Auth to the Flutter app
cb45a805 Sync binder, lend, trades, and settings per account
390018d9 Make every build state which Supabase project it uses
fbef9c53 Add server-owned entitlements for FABTrades Pro
216fc68c Pin the store product identifiers the app expects
24b3e97b Gate Pro through one accessor per client
890b7a9c Cut mobile releases from one tag
678b33de Drop the exec bit on the release scripts
54c72417 Tighten free-tier caps and add a loaned-card limit
ee8716c2 Lower the free want-list cap to 4 cards
f5d4f6fe Point staging at the free fabloodle Supabase project
b14f06fc Fix CI web Jest Babel load and lend quantity-merge test
6af57a54 Add My Account page and replace settings gear with a hamburger menu
f1b3115c Close the sign-in browser when the OAuth deep link returns
b3094f91 Let the sign-in callback take the Android custom tab down with it
cc37bbcd Document how browser sign-in gets out of the browser
778a5776 too much
69bbe878 Open the hamburger menu as a right-side drawer
a5c0c0a3 Use branded Google and Discord logos on sign-in buttons
58a07e0f trade history improvements
```

## Where RiftTrades stands today

The app is a mature Flutter app (`rifttrades`, v1.0.0+3, 224 unit tests plus 4
integration tests, all green) with the same feature set FAB Trades had *before*
this work: browse, trade balancer, binder and want list, lend tracking, card
scanning, settings.

It already uses Supabase, but only as an anonymous read-only catalog client:
`cards_with_prices`, `price_history`, and `app_config`, with the URL and
publishable key hardcoded in `app/lib/core/config/supabase_config.dart`. Every
piece of user data — binder, want list, lend groups, trade history, settings —
lives in SharedPreferences JSON and never leaves the device. There is no
`supabase/` directory, no SQL under version control, no auth, and no purchase
code of any kind.

Measured against the source app:

| | Count |
| --- | --- |
| Dart source files to add | 39 |
| Test files to add | 31 |
| Shared files that already diverged | 42 files, ~3,564 differing lines |

That last row is the thing to internalise: **this is not a file-copy job.**
`providers.dart` is 559 lines here against 1,068 there; `card_detail_screen.dart`
differs by 538 lines; `widgets.dart` by 306; `card_model.dart` by 167 because
Riftbound printings are not FAB pitch values. Only 10 of the 42 shared files are
byte-identical. Every shared file has to be edited by hand, and the game-specific
divergence has to survive.

RiftTrades also already has its own in-app update mechanism (`core/update/`,
`core/logic/app_version.dart`, `core/models/app_config.dart`, the `app_config`
table). FAB Trades built an equivalent under different names. That is a naming
divergence, not a gap — see "What not to port".

---

## Five decisions — settled

| # | Decision | Resolution |
| --- | --- | --- |
| 1 | Where user data lives | `rift_`-prefixed tables in the shared project |
| 2 | One Pro or two | Two — own RevenueCat project, `RiftTrades Pro` entitlement |
| 3 | Repo layout | Rename to `apps/mobile` + `services/price-pipeline`; no `packages/contracts` |
| 4 | Free-tier limits | Same as FAB Trades: binder 5, want list 4, loaned 1, trades 3 |
| 5 | Staging backend | Reuse the free `fabloodle` project (`cnmxaccamqshgvesieez`) |

The reasoning behind each, and the alternatives that were rejected, follows.

### 1. Where does RiftTrades' user data live? — `rift_` prefix

Both apps share **one Supabase project**, `tenrvaghaspwdvnwvgrh`. The live
schema today:

| Owner | Tables |
| --- | --- |
| RiftTrades | `sets`, `cards`, `card_prices`, `price_history`, `pipeline_runs`, `app_config` |
| FAB Trades | `fab_sets`, `fab_cards`, `fab_card_prices`, `fab_price_history`, `fab_pipeline_runs`, `fab_app_config` |
| FAB Trades (user data, unprefixed) | `trades`, `binder_entries`, `lend_groups`, `user_settings`, `entitlements`, `billing_events` |

The catalog convention is that RiftTrades takes bare names and FAB takes `fab_`.
For user data the opposite happened — FAB took the bare names, and its
`supabase/README.md` states this explicitly: *"Before adding a table, prefix it
`fab_` unless it is genuinely shared. `trades` predates this convention and is
FAB-only despite the bare name."*

So if RiftTrades syncs into `binder_entries`, it writes into a table that
**already holds 45 rows of Flesh and Blood binder data** (`lend_groups` has 6).
`card_id` is bare `text` in a single namespace with no game discriminator, and
the unique constraint is `(user_id, card_id, is_wanted)`. Anyone who uses both
apps would see FAB cards in their Riftbound binder and Riftbound cards in their
FAB binder, and the sync merge would treat the other game's rows as records this
device had deleted — so it would tombstone them. Silent, cross-app data loss.

**Decided: `rift_`-prefixed tables** — `rift_binder_entries`,
`rift_lend_groups`, `rift_trades`, `rift_user_settings`. It matches the
convention FAB Trades already wrote down, needs no migration of live FAB data,
touches no FAB code, and keeps the two apps' release cycles independent. The
cost is a duplicated schema and a second copy of the Edge Functions.

The alternatives, for completeness: add a `game` discriminator column to the
shared tables (requires migrating live data and editing the FAB app, and
permanently couples the two products), or give RiftTrades its own Supabase
project (cleanest isolation, but means moving the catalog and pipeline and
eventually paying for a second project).

### 2. Is Pro one subscription or two? — two

`entitlements` has `user_id` as its sole primary key — one row per person, no
product column — and the RevenueCat entitlement is named `FABTrades Pro`. There
is no way for one row to express "Pro in RiftTrades but not FAB Trades".

Worth knowing: Apple and Google sell in-app purchases per app. A single IAP
cannot span two App Store listings, so "buy once, unlock both" would require
your own cross-grant logic on top.

**Decided: two separate subscriptions** — a `RiftTrades Pro` entitlement
in its own RevenueCat project, with `rift_entitlements` and
`rift_billing_events` tables. This follows from decision 1 and matches how the
stores actually work.

### 3. Restructure the repo to match, or stay flat? — restructure

FAB Trades moved to `apps/web` + `apps/mobile` + `services/price-pipeline` +
`packages/contracts` + `supabase/`. Its reason was that the website was the repo
root and mobile was buried, which made mobile feel like a side project.

**That reason does not apply here** — RiftTrades has no web app, so `app/` is
already the main event.

**Decided: rename `app/` → `apps/mobile` and `pipeline/` →
`services/price-pipeline` anyway, and skip `packages/contracts`.** Not for
tidiness — because you are going to keep porting FAB Trades work across for as
long as both apps exist, and matching paths makes every future diff and
cherry-pick line up instead of needing manual translation. Skip `contracts`
because its entire purpose is pinning two implementations of the same rule
against each other, and with no web app there is no second implementation to
pin.

Do it as one isolated mechanical commit, early, before the new code lands. It
will break `.github/workflows/*` paths, `codemagic.yaml`, `context.md`, and the
docs. Note that FAB Trades' own code review found this move silently broke its
doc links, because the docs moved at 100% similarity and nothing forced their
references to follow — worth not repeating.

### 4. What are the free-tier limits for Riftbound? — same as FAB Trades

Decided: inherit FAB Trades' numbers unchanged. They are deliberately aggressive:

| Cap | Free limit | At the limit |
| --- | --- | --- |
| Binder | 5 distinct cards | Refuse the add, offer upgrade |
| Want list | 4 distinct cards | Refuse the add, offer upgrade |
| Loaned cards | 1 (by quantity, lent only) | Refuse; borrowing is uncapped |
| Saved trades | 3 | Trade still saves; oldest roll off |

These went in as a deliberate tightening (from 50 / 25 / none / 10). Because this
is the most user-visible decision in the port and the Riftbound catalog is much
smaller than FAB's (2,087 cards against 17,006), it is worth revisiting once
there is real usage data. Keep the numbers in one place so changing them is a
one-line edit.

### 5. What does staging point at? — the `fabloodle` project

FAB Trades pointed staging at a spare free project it already had, "fabloodle"
(`cnmxaccamqshgvesieez`), to avoid paying for a persistent Supabase branch. That
project now carries the full FAB schema alongside its unrelated tables.

**Decided: reuse `fabloodle` for RiftTrades staging too.** It is free and already
configured, so the only work is pushing the `rift_*` migrations to it and adding
`rifttrades://login-callback` to its redirect allow-list. The rejected
alternative was a separate free project per app — cleaner separation, but another
set of auth providers and secrets to keep in step.

Two consequences to keep in mind. Its auth providers are configured
independently of production, so Apple/Google/Discord have to be set up twice, and
the Apple Services ID needs the `fabloodle` callback URL registered alongside
production's. And because staging is a *separate* project rather than a branch of
production, the `rift_*` migrations have to be applied there explicitly — a
staging build talking to tables that do not exist yet fails at the first sync.

---

## Four bugs to fix on the way in, not port

FAB Trades' code review found these and **all four are still present in that
codebase**, verified just now. Porting the code as-is imports the bugs.

**1. An offline Pro subscriber loses their trade history, permanently and
everywhere.** `isProProvider` is deliberately fail-closed — correct for hiding a
feature, wrong for deciding whether to delete data — and `addTrade` uses it for
exactly that:

`apps/mobile/lib/core/providers.dart:921`

```dart
  int addTrade(Trade trade) {
    final all = [trade, ...state];
    if (ref.read(isProProvider) || all.length <= FreeLimits.savedTrades) {
      state = all;
      _persist();
      return 0;
    }
    state = all.take(FreeLimits.savedTrades).toList();
```

With bad signal, `getCustomerInfo()` throws and the server read returns null, so
a paying customer has `isPro == false` for the whole session. Confirming one
trade cuts a 40-trade history to 3. And `_persist()` runs through the sync
journal, so the dropped trades become tombstones that the next successful sync
pushes to the server — gone from every other device too. **Fix: gate the trim on
the entitlement having actually resolved, not on `isPro`.**

**2. The nightly job revokes every sandbox tester, every night.** RevenueCat
omits sandbox transactions from `GET /subscribers` unless asked. The webhook
passes the flag; the reconciler does not:

`supabase/functions/reconcile-entitlements/index.ts:78`

```typescript
      fetchSubscriber: (appUserId) => fetchSubscriber(appUserId, apiKey),
```

An active sandbox row reads back as "no purchase" and gets overwritten to free at
05:00 UTC. `is_sandbox` is already on the row, so this is a one-argument fix —
and it matters immediately during testing.

**3. Two concurrent webhook deliveries can pin a paying customer to free with no
way back.** The read-then-overwrite in the handler is only idempotent for
sequential deliveries. A retried `EXPIRATION` that reads before a renewal is
applied, racing a concurrent `RENEWAL`, ends with the expiration's write
clobbering the row back to inactive. The repair layer cannot see it either,
because the nightly sweep filters `.eq('is_active', true)` — so a wrongly-inactive
row is invisible until the customer's next store event, possibly a year out.
**Fix: make the write conditional on `updated_at` predating the RevenueCat read,
and let the sweep revisit recently-deactivated rows.**

**4. Sync silently truncates past 1,000 rows.** `supabase/config.toml` sets
`max_rows = 1000`, and neither the reconciler's `listDue` nor the client's
`fetchAll` orders or pages:

`apps/mobile/lib/core/sync/remote_store.dart:38`

```dart
  Future<List<Map<String, dynamic>>> fetchAll(String userId) async {
    final rows = await client.from(table).select().eq('user_id', userId);
    return rows.cast<Map<String, dynamic>>();
  }
```

A fresh device pulls a nondeterministic subset of a large binder. **Fix: order by
a stable key and page with `.range()`.**

---

## The plan

Nine phases. Each is meant to be its own commit or small PR, land green, and be
independently revertable. Phases 0–4 are strictly sequential; 5 depends on 3 and
4; 6, 7, and 8 can be done in any order after 5.

What follows is the **rationale** for each phase — what it is for and what makes
it dangerous. The step-by-step instructions live in `port/PHASE-N.md`, and those
files are authoritative.

| Phase | Steps | Rationale below |
| --- | --- | --- |
| 0 | [port/PHASE-0.md](port/PHASE-0.md) | Repo restructure |
| 1 | [port/PHASE-1.md](port/PHASE-1.md) | Schema under version control |
| 2 | [port/PHASE-2.md](port/PHASE-2.md) | Build-time environment config |
| 3 | [port/PHASE-3.md](port/PHASE-3.md) | Supabase Auth |
| 4 | [port/PHASE-4.md](port/PHASE-4.md) | Cloud sync |
| 5 | [port/PHASE-5.md](port/PHASE-5.md) | Pro subscriptions and entitlements |
| 6 | [port/PHASE-6.md](port/PHASE-6.md) | CI |
| 7 | [port/PHASE-7.md](port/PHASE-7.md) | One release tag for both stores |
| 8 | [port/PHASE-8.md](port/PHASE-8.md) | Remaining UI parity and docs |

### Phase 0 — Decisions and groundwork

- Rename `app/` → `apps/mobile` and `pipeline/` → `services/price-pipeline` per
  decision 3. Update `.github/workflows/*`, `codemagic.yaml`, `context.md`,
  `README.md`, and `docs/*`. One mechanical commit, nothing else in it — every
  path in the phases below assumes it has happened.
- Delete the empty `app/lib/features/collection/` directory left over from the
  binder rework.

### Phase 1 — Schema under version control

Create `supabase/` with `config.toml` and a baseline migration describing the
RiftTrades tables that already exist in production (`sets`, `cards`,
`card_prices`, `price_history`, `pipeline_runs`, `app_config`, and the
`cards_with_prices` view), matching live reality exactly.

Two hazards specific to sharing a project across two repos:

- **Do not `supabase db pull` or `db diff` naively.** It will pull the `fab_*`
  tables and the FAB user-data tables too, and a later push could try to drop
  objects this repo does not know about. Hand-write the baseline.
- **`supabase_migrations.schema_migrations` is shared.** Migration versions from
  both repos interleave, so this repo's history will have gaps that belong to FAB
  Trades — the mirror image of what FAB's README documents. `db push` does not
  work from this repo: the remote has FAB Trades versions with no matching files
  here, so the CLI aborts before applying anything. Apply migrations by executing
  their SQL against the database, then inserting the version row by hand. A clean
  `supabase db start` gives a RiftTrades-only database, which means no RiftTrades
  migration may reference a `fab_*` object.

Write `supabase/README.md` stating the ownership split from this side.

### Phase 2 — Build-time environment config

FAB Trades did this *after* auth and sync; do it **first** here, because auth,
sync, and purchases all need staging isolation from day one, and retrofitting it
means redoing the work.

- `apps/mobile/env/production.json` and `env/staging.json` carrying `APP_ENV`,
  `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, plus an `env/README.md`.
- Rewrite `core/config/supabase_config.dart` (currently 9 lines of hardcoded
  values) to read `String.fromEnvironment` with **no default** for URL or key,
  and add `assertConfigured()` that throws a message naming the fix.
- Call it in `main.dart` before `Supabase.initialize`.
- Add `test/core/config/build_env_test.dart` asserting both env files are
  well-formed and that staging is not production.
- Add the `grep -q '"SUPABASE_URL": *"http'` guard to both release pipelines so a
  misconfigured build fails before it is signed.
- Show a "Test build" row in Settings when `APP_ENV != production`.

Every `flutter run` / `flutter build` invocation now needs
`--dart-define-from-file=env/production.json`. Update every doc that shows a
build command.

### Phase 3 — Supabase Auth

Port from `apps/mobile`, adapting names. Roughly 700 lines of source plus tests.

New files: `core/config/auth_config.dart`, `core/data/auth_repository.dart` (262
lines), `core/models/account.dart` (146), `features/auth/sign_in_sheet.dart`
(182), `features/auth/auth_provider_icons.dart` (70),
`features/settings/account_screen.dart` (23),
`features/settings/account_section.dart` (254).

- Deep link is `rifttrades://login-callback`. Three places must agree exactly:
  `AuthConfig.redirectUrl`, the native config, and the Supabase dashboard
  allow-list.
- Three providers. Apple uses the native sheet on iOS via `sign_in_with_apple`
  with a SHA-256 nonce (Apple gets the hash, Supabase gets the raw value — that
  asymmetry is what defeats a replayed identity token). Google and Discord go
  through the browser and return via the deep link.
- Include the follow-up commits that close the browser after the callback
  (`f1b3115c`, `b3094f91`) and use branded logos (`a5c0c0a3`) — those were bug
  fixes to the first cut, so port the fixed version.
- Native config: AndroidManifest VIEW intent-filter for the scheme plus
  `launchMode="singleTask"` on `MainActivity`; `CFBundleURLSchemes` in
  `Info.plist`; `com.apple.developer.applesignin` in `Runner.entitlements`.
  RiftTrades has **no** URL scheme registered on either platform today.
- Providers in `providers.dart`: `authRepositoryProvider`, `accountProvider`
  (a `StreamProvider<Account?>` over `authStateChanges`), `isSignedInProvider`,
  `authProvidersProvider`.
- New deps: `sign_in_with_apple: ^7.0.1`, `crypto: ^3.0.7`,
  `flutter_svg: ^2.3.0`.
- Also port the account UI rework (`6af57a54`, `69bbe878`): the settings gear
  becomes a hamburger opening a right-side drawer, with a My Account page.

**Coordination hazard:** auth is project-wide, not per-app. Both products share
one `auth.users` table and one redirect allow-list, and FAB Trades' repo owns the
`config.toml` for this project. Adding `rifttrades://login-callback` has to
happen in the dashboard *and* in FAB's `config.toml`, or a future
`supabase db push` from that repo will drop it. One upside: a person signing in
gets the same account in both apps.

### Phase 4 — Cloud sync

The largest phase. ~1,100 lines of new source in `core/sync/` plus a rewrite of
the four repositories, and it changes how every piece of user data persists.

New: `sync_record.dart` (84), `sync_adapter.dart` (78), `sync_journal.dart`
(233), `remote_store.dart` (106), `collection_sync.dart` (186),
`sync_service.dart` (152), `binder_sync.dart` (103), `lend_sync.dart` (80),
`trade_sync.dart` (111), `settings_sync.dart` (87),
`core/data/cached_collection.dart` (77), `features/sync/sync_host.dart` (55).

- Convert `BinderRepository`, `LendRepository`, `TradeRepository` to extend
  `CachedCollection`, and teach `SettingsRepository` the journal. **Keep the
  existing SharedPreferences keys** (`collection_entries`, `lend_groups`,
  `saved_trades`, `app_settings`) — renaming them orphans every existing user's
  data.
- The merge model, precisely: per-record last-write-wins on a client-supplied
  `updated_at`; on an exact tie, remote wins only if remote is a tombstone and
  local is live (deletion beats resurrection), otherwise local wins. Deletes are
  tombstones, never row removals.
- `save()` versus `saveSynced()` is the load-bearing distinction. `save()`
  fingerprints before and after and journals the difference, so a user edit is
  attributed to this device. `saveSynced()` writes without journalling, and is
  what merge results and the account-switch discard use. Getting these backwards
  makes a device win every merge, or silently tombstone data.
- Account switch: if the journal's `syncedUserId` differs from the incoming user,
  discard local binder/lend/trades via `saveSynced(const [])` and clear the
  journal — but keep settings, which are a device preference. If it is null (never
  synced), local data merges upward, which is how an existing install's data
  arrives without a migration step.
- Migration: create the four tables per decision 1. Each carries `user_id` FK to
  `auth.users ON DELETE CASCADE`, a client-supplied `updated_at`, `deleted_at`
  for tombstones, RLS with `auth.uid() = user_id` on all four verbs, and an index
  on `(user_id, updated_at DESC)`. Identity is `(user_id, client_id)` except
  binder, which is `(user_id, card_id, is_wanted)`.
- **Apply fix 4 here** — page `fetchAll` rather than inheriting the truncation.
- Wire `SyncNotifier` / `SyncStatus` / `SyncOutcome` / `SyncDomain` into
  `providers.dart`, mount `SyncHost` at the app root, and invalidate only the
  domains that changed.
- Port the test fakes wholesale — `FakeRemoteCollection`, `StubSyncNotifier`, the
  fake browser for auth — they are what make this testable without a network.
  That is ~1,200 lines of sync tests worth having.

Two known gaps in the source worth deciding on rather than inheriting silently:
sync fires **once per launch** (no timer, no resume hook, no push-on-write) while
the failure copy claims it "will sync when the connection recovers"; and the
trade-history trim applies retroactively, so a long-standing install loses
history the first time it saves a trade.

### Phase 5 — Pro subscriptions and entitlements

- **Client:** `core/models/entitlement.dart` (220), `subscription_status.dart`
  (110), `purchase_outcome.dart` (66), `core/data/entitlement_repository.dart`
  (29), `purchases_repository.dart` (249), `core/config/revenuecat_config.dart`
  (94), `core/logic/pro_packages.dart` (58), `core/logic/free_limits.dart` (60).
- **Paywall UI:** `features/paywall/pro_paywall.dart` (236), `pro_gate.dart`
  (140), `pro_limits.dart` (131),
  `features/settings/subscription_section.dart` (350).
- **Deps:** `purchases_flutter: ^10.4.3` and `purchases_ui_flutter: ^10.4.3`,
  pinned together — they ship in lockstep.
- The architecture that matters: purchase happens in the store, but *access* is a
  row in Postgres keyed by Supabase `user_id`, written only by the service role
  from a RevenueCat webhook. Clients can read their own row and nothing else, so
  nobody can grant themselves Pro. Mobile grants Pro if **either** the device
  receipt or the server row says active — withholding access from someone who
  paid is worse than briefly granting it before a refund propagates.
- Keep the "exactly one accessor" rule: `subscriptionProvider` and
  `serverEntitlementProvider` feed `entitlementProvider`, which feeds
  `isProProvider`, and every gate reads `isProProvider`. Nothing else touches
  `CustomerInfo` or the entitlement row.
- `Purchases.logIn(supabaseUserId)` is the linchpin — an anonymous
  `$RCAnonymousID:…` purchase can never be attributed to an account. Gate the
  paywall behind sign-in and await the bind before presenting it.
- Enforce the decision-4 limits in the notifiers: refuse for binder, want list,
  and loaned cards; trim-oldest for trade history. Surface caps as a snackbar
  with an Upgrade action that retries the original action on success — not a
  modal, because someone who tapped "Add to Binder" did not ask to be sold to.
- Only show usage counts once a cap is in sight (the 70% rule). A readout at 1 of
  5 reads as nagging.
- **Apply fix 1 here.**
- **Backend:** `rift_entitlements` and `rift_billing_events` migrations, plus
  `supabase/functions/` with `_shared/` (`http.ts`, `revenuecat.ts`,
  `entitlement.ts`), `revenuecat-webhook/`, and `reconcile-entitlements/`.
  Parameterise table name and entitlement id via environment so the code stays
  near-identical to FAB's and can be deduped later.
- **Apply fixes 2 and 3 here**, and add the sandbox test the source is missing.
- Nightly reconcile via a GitHub Actions cron at `0 5 * * *` UTC.
- Keep the webhook's fail-closed constant-time secret compare and its 503-vs-500
  distinction: 503 for missing configuration (so RevenueCat stops retrying a
  deploy that can never succeed), 500 only for genuinely transient failures.

### Phase 6 — CI

RiftTrades has no CI for the app today — only a price-ingest cron and a manual
Android release. Add `ci.yml` on push-to-main and all PRs, using
`dorny/paths-filter` to run only what changed:

| Job | Runs |
| --- | --- |
| mobile | `flutter analyze`, `flutter test`, the release-tag script test |
| supabase | `supabase db start` (clean migration apply), `supabase db lint` |
| functions | `deno fmt --check`, `deno lint`, `deno check`, `deno test` |

### Phase 7 — One release tag for both stores

Today Android is `workflow_dispatch`-only and Codemagic is triggered by hand, so
the two stores can ship the same version number running different code. That
matters much more once Pro behaviour depends on the exact build.

- Add `scripts/check-release-tag.sh` plus its test, asserting the tag matches
  `pubspec.yaml`.
- Trigger both Android (GitHub Actions) and iOS (Codemagic) from one
  `mobile-v*` tag, with the tag check running before either build. Using the same
  tag prefix as FAB Trades keeps the script byte-identical; the two repos have
  separate tag namespaces, so there is no collision.
- Leave build numbers store-assigned (Play API max+1, TestFlight latest+1).

**Flag:** the Android `applicationId` is `com.rifttrades.myapp` while the iOS
bundle is `com.rifttrades.rifttrades` (and the Gradle namespace is
`com.rifttrades.rifttrades` too). The Android id is published and cannot change.
Both identifiers need to be right in RevenueCat, the store consoles, and the
Apple Services ID, and the mismatch is an easy thing to get wrong once.

### Phase 8 — Remaining UI parity and docs

Lower priority. Four small shared widgets — `lib/app/card_filter_bar.dart`,
`lib/app/fallback_network_image.dart`, `lib/app/printing_picker.dart`, and
`lib/core/logic/set_abbreviation.dart` — plus the trade history improvements from
`58a07e0f`. All four widgets were checked and are game-neutral: they deal with
foil, sorting, image fallback, and set codes.

One of them will not compile as copied. `printing_picker.dart` calls
`card.setVersionLabel` and `card.finishBadgeLabel`, and RiftTrades' `CardModel`
has neither — it has `finishLabel` only. `setVersionLabel` exists to separate
Flesh and Blood's First Edition from Unlimited printings, which Riftbound has no
equivalent of, so the label collapses to `finishLabel` rather than the getters
being added here.

Docs to write here: `ENVIRONMENTS.md`, `ENTITLEMENTS.md`, and `RELEASING.md`.
Update `ARCHITECTURE.md`, `DATABASE.md`, `context.md`, `CHANGELOG.md`, and
`README.md` — the README currently still claims the Flutter app has not been
started.

---

## What not to port

- **`packages/contracts`** — golden fixtures exist to stop two implementations of
  one rule from drifting. With no web app there is no second implementation.
- **`apps/web` and `netlify.toml`** — no web app here.
- **FAB's in-app update feature** (`core/data/app_update_repository.dart`,
  `core/models/app_update_config.dart`, `core/logic/version_compare.dart`,
  `features/update/update_prompt.dart`) — RiftTrades already has a working
  equivalent under different names, backed by its own `app_config` table. Keep
  what is here.
- **`features/settings/subscription_section.dart`'s FAB-specific copy**, product
  ids, and the `FABTrades Pro` entitlement id — all of these need Riftbound
  values, not translation.

## Out-of-repo setup you will have to do by hand

None of this can be done from the repo, and several items block testing:

1. **App Store Connect** — subscription group, two auto-renewable products, an
   in-app purchase key, and a sandbox tester.
2. **Play Console** — two subscriptions with activated auto-renewing base plans,
   and license testers.
3. **RevenueCat** — a RiftTrades project with an iOS app and a Play app, the four
   products imported and attached to a `RiftTrades Pro` entitlement, and a
   current offering filling the `$rc_monthly` and `$rc_annual` slots.
4. **Store server notifications** — Apple S2S v2 and Play RTDN via Pub/Sub.
5. **Supabase auth providers** — enable Apple, Google, and Discord, and add
   `rifttrades://login-callback` to the redirect allow-list. Apple needs an App
   ID *and* a Services ID, comma-separated, plus a client secret JWT generated
   from a `.p8` key (it expires within 6 months and needs regenerating).
6. **Supabase function secrets** — `REVENUECAT_WEBHOOK_SECRET`,
   `REVENUECAT_API_KEY` (the `sk_` secret key), `RECONCILE_SECRET`, and the
   entitlement id.
7. **GitHub secrets** — `SUPABASE_FUNCTIONS_URL`, `RECONCILE_SECRET`,
   `REVENUECAT_GOOGLE_API_KEY`, and `REVENUECAT_APPLE_API_KEY` in Codemagic.

One trap worth stating plainly: debug builds use the RevenueCat Test Store, so
**store misconfiguration only ever surfaces in a release build.**

## Risks, ranked

1. **Cross-app data corruption** if any table name or conflict target from
   decision 1 is left unprefixed by accident. It is silent, it destroys real user
   data in both apps, and tombstones make it hard to undo. Worth a grep for the
   bare table names before the sync phase merges.
2. **The 3,564 diverged lines.** Copying a shared file wholesale from FAB Trades
   overwrites Riftbound-specific behaviour — most dangerously in `card_model.dart`,
   `card_repository.dart`, `theme.dart`, and `card_detail_screen.dart`.
3. **Losing existing users' local data** during the sync port, by renaming a
   SharedPreferences key or calling `save()` where `saveSynced()` belongs.
4. **Auth config is shared and lives in the other repo.** A `db push` from FAB
   Trades can silently remove RiftTrades' redirect URL and break sign-in with no
   code change here.
5. **`providers.dart` doubling in size** (559 → ~1,070 lines). It is already the
   file every feature touches. The source app's review flagged it as the one file
   that departs from the feature-first structure; consider splitting the auth,
   sync, and entitlement providers into their own files as they land.
