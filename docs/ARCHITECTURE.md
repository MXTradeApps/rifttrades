# RiftTrades — Architecture

A cross-platform (Android + iOS) mobile companion for trading **Riftbound**
(Riot Games' League of Legends TCG). Look up prices, balance trades, manage binder
and want lists, lend cards, and scan.

**Status:** Auth, sync, Pro entitlements, and shared UI widgets are in place.
This document describes what shipped, not the original build plan.

---

## 1. Goals & non-goals

### Goals
- Price lookup for any Riftbound printing (normal/foil), TCGplayer (USD) or
  CardMarket (EUR).
- Trade balancer with Confirm Trade → history + binder reconcile.
- Binder and want list, lend/borrow tracker, camera scan (visual hash + OCR).
- Offline-first user data; signed-in cloud sync; RiftTrades Pro via RevenueCat.

### Non-goals
- Gameplay simulation / deck legality.
- A marketplace.
- A product web app (mobile-only). Static Privacy / Terms pages for store
  review live in `apps/legal/` and are not part of the product UI.

---

## 2. Stack

- **Flutter** (`apps/mobile`), package name `rifttrades`, root widget `RiftTradesApp`
- **Riverpod** state (no codegen)
- **supabase_flutter** for catalog reads, Auth, and sync
- **SharedPreferences** for local user data (not drift)
- **cached_network_image**, **fl_chart**, **camera** + **google_mlkit_text_recognition**
- **purchases_flutter** / RevenueCat for subscriptions

Build/run always needs `--dart-define-from-file=env/production.json` (or
`env/staging.json`). See [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

## 3. Data backend

A Node ingest under `services/price-pipeline` runs daily (GitHub Actions) and
upserts into Supabase: TCGCSV (Riftbound game id 89) + CardMarket. Clients only
read. See [DATABASE.md](DATABASE.md).

```
[TCGCSV + CardMarket]
        │  services/price-pipeline (Node) — daily Action
        ▼
Supabase:  sets · cards · card_prices · price_history
        │  + rift_* user-data tables
        └───────────────► Flutter app
```

---

## 4. Auth

Supabase Auth with Apple, Google, Discord, and email/password (App Review demo
path). Deep-link scheme `rifttrades`,
redirect `rifttrades://login-callback`. Session restore gates sync and Pro
identity binding (`Purchases.logIn` with the Supabase user id).

Signed-out use remains fully supported: binder, trades, and settings stay on
device. Sync is an addition, never a precondition for drawing a screen.

---

## 5. Cloud sync

Local SharedPreferences remain the read source of truth. After sign-in,
`SyncNotifier` runs **once per launch** (see Known gaps), reconciles each domain
against the `rift_*` tables, and refreshes providers whose cache changed.

### Merge rule

Per-record **last-write-wins** on client-supplied `updated_at`, with deletes as
tombstones (`deleted_at`). Implemented in `mergeRecords` (`lib/core/sync/sync_record.dart`):

- Newer `updated_at` wins.
- Equal timestamps with a delete on one side prefer the delete.
- Otherwise a tie keeps the local copy so the device in hand does not appear to
  discard an edit you just made.

`SyncJournal` (prefs key `sync_journal_v1`) stores per-record timestamps,
tombstones, high-water marks, and which account the cache belongs to — without
changing the on-disk shape of binder/trade/settings JSON that existing installs
already have.

---

## 6. Entitlements (RiftTrades Pro)

Access is a row in `rift_entitlements`, written only by Edge Functions
(RevenueCat webhook + nightly reconcile). Clients may `select` their own row.

### Single-accessor rule

Every Pro decision goes through:

`entitlementProvider` → `isProProvider`

Nothing else reads `CustomerInfo` or the server row to decide access. Mobile
merges device SDK state with the server row and grants Pro when **either** says
so (device is instant after purchase; server covers cross-platform). Destructive
trims (trade-history window) also consult `entitlementResolvedProvider` so an
unknown entitlement cannot delete history.

Details: [ENTITLEMENTS.md](ENTITLEMENTS.md). Caps: [../context.md](../context.md).

---

## 7. App structure

```
apps/mobile/lib/main.dart
apps/mobile/lib/app/           # theme, shell, shared widgets
apps/mobile/lib/core/config/   # Supabase, Auth, RevenueCat
apps/mobile/lib/core/data/     # repositories
apps/mobile/lib/core/logic/    # pricing, free limits, set sort
apps/mobile/lib/core/models/
apps/mobile/lib/core/sync/     # journal, merge, adapters
apps/mobile/lib/core/scan/     # pHash + frame hashing
apps/mobile/lib/features/      # search, card_detail, trade, binder,
                               # want_list, lend, scan, settings, auth, paywall, sync
```

---

## 8. Scanning

Each camera frame fuses a 256-bit perceptual hash of the guide rectangle against
bundled catalog hashes with ML Kit name / collector-number OCR (Reciprocal Rank
Fusion). See `docs/card-scanning-research.md` and `docs/card-scanning-learnings.md`.

---

## Known gaps

Inherited from the shared mobile design; not introduced by this port, but both
will generate support questions.

### Sync runs once per launch

There is no timer, no resume-on-connectivity hook, and no push-on-write. If a
sync fails, the UI now says data will retry on the **next launch**. Softening
that copy was preferred over claiming automatic recovery that the code does not
do. A proper fix is a connectivity resume hook (or periodic retry) that calls
`SyncNotifier.sync` again.

### Trade-history trim is retroactive

Free tier keeps three saved trades (`FreeLimits.savedTrades`). A free user who
already had more than three from before the cap shipped loses the excess the
first time they save a trade. Guarding on `entitlementResolvedProvider` stops
trimming while Pro state is *unknown*, but a genuinely free user still loses
history. Prefer a one-time grandfather, or trim only rows created after the cap
shipped.
