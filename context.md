# RiftTrades — Agent Handoff Context

Living handoff doc so any agent can pick up where the last left off. Keep it
updated as you finish work. Complements `docs/ARCHITECTURE.md` and
`docs/DATABASE.md`.

## What this is

Cross-platform (Android + iOS) Flutter app for trading **Riftbound** cards:
price lookup, trade balancing, binder/want lists, lend tracker, card scanning.
Reads from a shared **Supabase** DB populated daily by the Node ingest under
`services/price-pipeline`.

## Language

**Binder**:
The product noun for a named pile of owned Printings. A player can have
more than one. The type is always Binder — do not rename the Binder
destination or tab.

**Trade Binder**:
The tradeable-stock Binder (`role = trade`, `client_id = system:trade`).
Confirm Trade, Trade Filler, public share, and default adds (when no
Binder list is open) use this pile. It is never deleted. Putting a card
here marks it for trade.

**Collection**:
The default keep-pile Binder **name** (`role = standard`,
`client_id = system:collection`). Owned, not for trade. The type is still
Binder. Do not treat Collection as a second product noun or as a rename
of the Binder tab.

**Want List**:
Cards a player is looking to acquire (`isWanted`). Not a Binder. Not a
grid tile. Reachable as a sibling of the Binder grid (mobile tab /
`/wants`).

**Lend**:
Cards lent out or borrowed. A separate type. Lend does not read or write
Binders; Binder totals and the value overlay do not include Lend.

**Trade Filler**:
A suggested card whose price closes the value gap of a live trade. The side
that owes value determines whose cards are relevant: my side needs value → my
Binder; their side needs value → my Want List. RiftTrades Pro only.

**Confirm Trade**:
The single action that executes a live trade: it is recorded to history and
the Binder updates to match — given cards leave, received cards enter (each
skippable, but on by default). A cleared trade touches nothing.
_Avoid_: Save trade

**Printing**:
A specific physical version of a card (set + finish), keyed by
`<product_id>-<subtype>`. Binder and trade entries reference printings, not
card names. Finish is Riftbound **Normal / Foil**.

**Condition**:
Physical wear grade of a Binder entry (NM, LP, MP, HP, DMG). Descriptive only —
the app does not price-adjust by condition.

See `docs/BINDER-PLAN.md` for Phase 7 Binder (B1–B4).

## Repo layout

- `apps/mobile/` — Flutter app (peer client).
- `apps/web/` — web product UI (peer client in this repo).
- `services/price-pipeline` — Node ingest (TCGCSV + CardMarket → Supabase).
- `supabase/` — migrations + Edge Functions (auth sync, entitlements).
- `docs/` — architecture, database, environments, entitlements, releasing.
- `docs/port/` — port execution phases (historical once Done).

## Free-tier limits

| Cap | Value | At the cap |
| --- | --- | --- |
| Distinct cards **per Binder** | 50 | refuse a new Printing (qty-up allowed) |
| Live Binders | 4 | Pro upgrade; create nothing |
| Want-list cards | 25 (mobile) / 50 (web) | refuse the add (unchanged here) |
| Loaned cards | 25 (mobile) / 1 (web) | refuse; borrowing uncapped |
| Saved trades | 3 | trim oldest; never refuse the save |

Constants live in `apps/mobile/lib/core/logic/free_limits.dart`. Pro unlocks via
RevenueCat entitlement id `RiftTrades Pro` — see `docs/ENTITLEMENTS.md`.

## Supabase (client, safe to ship)

- URL: `https://cnmxaccamqshgvesieez.supabase.co`
- Publishable key: `sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom`
- Project id: `cnmxaccamqshgvesieez` (fabloodle)
- Catalog tables are public read-only (RLS). User data uses `rift_*` tables
  scoped to `auth.uid()`.
- Query the **`cards_with_prices`** view for catalog search.

### `cards_with_prices` columns

`id` (text PK = `<product_id>-<subtype>`), `product_id` (bigint, NOT unique across
finishes), `set_id`, `unique_id`, `name`, `clean_name`, `image_url`, `tcgplayer_url`,
`sub_type_name`, `is_foil` (bool), `rarity`, `collector_number` (e.g. `"147/219"`,
the scan key), `is_sealed` (filter `= false`), `cardmarket_id`, `cardmarket_name`,
`modified_on`, `set_name`, `tcg_low/tcg_mid/tcg_high/tcg_market/tcg_direct_low` (USD),
`cm_avg/cm_low/cm_trend` + `_foil` variants (EUR), `price_updated_at`.

## Local dev (Windows)

- Flutter at `C:\Users\maxes\flutter\bin` (stable).
- Emulator AVD: **RiftPixel**.
- Run (PowerShell):

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$sdk="$env:LOCALAPPDATA\Android\Sdk"; $env:ANDROID_HOME=$sdk
$env:Path="C:\Users\maxes\flutter\bin;$sdk\platform-tools;"+$env:Path
Start-Process "$sdk\emulator\emulator.exe" -ArgumentList '-avd','RiftPixel'
# wait for boot, then from apps/mobile:
flutter run --dart-define-from-file=env/production.json -d emulator-5554
```

- Tests: `flutter test --dart-define-from-file=env/production.json`
- GitHub: https://github.com/Max-Escaler/rifttrades

## Architecture decisions

- **State:** `flutter_riverpod` (no codegen).
- **Persistence (user data):** `shared_preferences` JSON for settings, binder
  (prefs key still `collection_entries`), lend groups, trade history.
  Card catalog from Supabase (+ `cached_network_image` for art).
- **Navigation:** bottom nav shell (Browse / Trade / Binder / Lend) via IndexedStack;
  Scan is a pushed route; Settings + card detail are pushed routes.
- **Auth / sync / Pro:** Supabase Auth; sync once per launch; Pro via
  `entitlementProvider` → `isProProvider` only.
- **Charts:** `fl_chart`. **Scan:** camera + ML Kit + bundled pHash index.

## App code map (`apps/mobile/lib/`)

- `lib/app/` — theme, shell, shared widgets (`CardFilterBar`,
  `FallbackNetworkImage`, `printing_picker`, `CardThumbnail`, `CardRow`, …)
- `lib/core/models/` — card, settings, trade, binder, entitlement, …
- `lib/core/data/` — repositories (catalog, binder, lend, trade, settings,
  entitlements, purchases, …)
- `lib/core/sync/` — journal, merge, domain adapters, remote store
- `lib/core/logic/` — pricing, free limits, set sort, set abbreviation, …
- `lib/core/providers.dart` — Riverpod wiring (`sharedPreferencesProvider`
  overridden in `main.dart`)
- `lib/features/` — `search/` (Browse), `card_detail/`, `trade/`, `binder/`,
  `want_list/`, `lend/`, `scan/`, `settings/`, `auth/`, `paywall/`, `sync/`

Browse assets: `assets/setLogos.json`, `assets/setPublishedOn.json`,
`assets/set_logos/*.png`.

## Gotchas

- Do NOT put a nested `Scaffold.bottomNavigationBar` inside IndexedStack tab
  screens — use a Column with the bar as the last child (see trade screen).
- Trade draft is in-memory (resets on restart). Binder + history persist via prefs.
- Adding native plugins requires a full `flutter run --dart-define-from-file=…`
  rebuild, not hot reload.
- Never rename SharedPreferences keys listed in `docs/port/CONVENTIONS.md`.

## Mobile release (CI)

One `mobile-vMAJOR.MINOR.PATCH` tag (matching `apps/mobile/pubspec.yaml` before
`+`) triggers both stores: GitHub Actions
`.github/workflows/release-android-closed.yml` → Play closed testing; iOS is
archived and uploaded to TestFlight locally in Xcode from the same tagged commit
(run `scripts/check-release-tag.sh` first). Manual `workflow_dispatch` remains as
an escape. Details: `docs/RELEASING.md`.

Required secrets include keystore + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` for
`com.rifttrades.myapp`. Android `applicationId` is `com.rifttrades.myapp`
(published, cannot change); namespace `com.rifttrades.rifttrades`; iOS bundle id
`com.rifttrades.rifttrades`.