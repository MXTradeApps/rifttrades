# RiftTrades — Agent Handoff Context

Living handoff doc so any agent can pick up where the last left off. Keep it updated
as you finish work. This complements `docs/ARCHITECTURE.md` (the plan) and
`docs/DATABASE.md` (the shared DB schema).

## What this is
Cross-platform (Android + iOS) Flutter app for trading **Riftbound** cards, inspired by
**MTG Trades**: price lookup, trade balancing, binder/want lists, card scanning.
Reads from a shared **Supabase** DB populated daily by `services/price-pipeline/` (Node + GitHub Action).

## Language

**Binder**:
The cards a player is willing to trade away right now — their tradeable stock.
Putting a card in the Binder is the act of marking it for trade. There is no
owned-but-not-tradeable concept: deck cards and shoebox bulk do not exist in
the app.
_Avoid_: Collection, inventory, owned cards

**Want List**:
Cards a player is looking to acquire. Shown to other players as a visual grid
so they can check their binder against it.

**Trade Filler**:
A suggested card whose price closes the value gap of a live trade. The side
that owes value determines whose cards are relevant: my side needs value → my
Binder; their side needs value → my Want List.

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
- `services/price-pipeline/` — Node ingest (TCGCSV + CardMarket → Supabase). DONE + running daily.
- `apps/mobile/` — the Flutter app (this is the active work).
- `docs/ARCHITECTURE.md` — plan/roadmap (source of truth for scope).
- `docs/DATABASE.md` — Supabase connection + schema.

## Supabase (client, safe to ship)
- URL: `https://tenrvaghaspwdvnwvgrh.supabase.co`
- Publishable key: `sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr`
- Project id: `tenrvaghaspwdvnwvgrh`
- Tables are public read-only (RLS). Only the pipeline's service_role writes.
- Query the **`cards_with_prices`** view. 1631 real (non-sealed) cards.

### `cards_with_prices` columns
`id` (text PK = `<product_id>-<subtype>`), `product_id` (bigint, NOT unique across
finishes), `set_id`, `unique_id`, `name`, `clean_name`, `image_url`, `tcgplayer_url`,
`sub_type_name`, `is_foil` (bool), `rarity`, `collector_number` (e.g. `"147/219"`,
the scan key), `is_sealed` (filter `= false`), `cardmarket_id`, `cardmarket_name`,
`modified_on`, `set_name`, `tcg_low/tcg_mid/tcg_high/tcg_market/tcg_direct_low` (USD),
`cm_avg/cm_low/cm_trend` + `_foil` variants (EUR), `price_updated_at`.

- Rarities: `Common, Uncommon, Rare, Epic, Showcase, Promo, None` (+ null).
- Sets: `Origins`, `Origins: Proving Grounds`, `Spiritforged`, `Unleashed`, `Vendetta`,
  `Riftbound Promotional Cards`, `Riftbound Judge Promotional Cards`,
  `Riftbound Organized Play Promotional Cards`.
- `price_history(id, card_id, captured_on, tcg_market, tcg_low, cm_trend, cm_low)` —
  ~1 row/card so far (charts get richer as days accumulate).

## Local dev environment (Windows, already set up)
- Flutter at `C:\Users\maxes\flutter\bin` (stable 3.44.4).
- Android SDK at `%LOCALAPPDATA%\Android\Sdk`; cmdline-tools installed, licenses accepted.
- JDK: `C:\Program Files\Android\Android Studio\jbr` (set `JAVA_HOME` for sdkmanager).
- Emulator AVD name: **RiftPixel** (Pixel 7, android-36 google_apis_playstore x86_64).
- Run app on emulator (PowerShell):
  ```powershell
  $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
  $sdk="$env:LOCALAPPDATA\Android\Sdk"; $env:ANDROID_HOME=$sdk
  $env:Path="C:\Users\maxes\flutter\bin;$sdk\platform-tools;"+$env:Path
  Start-Process "$sdk\emulator\emulator.exe" -ArgumentList '-avd','RiftPixel'
  # wait for boot, then:
  cd C:\Users\maxes\RiftTrades\apps\mobile; flutter run --dart-define-from-file=env/production.json -d emulator-5554
  ```
- Screenshot: `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png out.png`
  (don't use PowerShell `>` redirect for binary — it corrupts the PNG).
- GitHub repo: https://github.com/Max-Escaler/rifttrades

## Architecture decisions for the app
- **State:** `flutter_riverpod` (no codegen).
- **Persistence (user data):** `shared_preferences` storing JSON for settings, binder
  (prefs key still `collection_entries`), and trade history (small data, fully offline).
  Card catalog comes from Supabase (+ `cached_network_image` for art). Heavier
  drift/sqflite intentionally avoided for now.
- **Navigation:** bottom nav shell (Browse / Trade / Binder / Lend) via IndexedStack;
  Scan is a pushed route; Settings + card detail are pushed routes.
- **Charts:** `fl_chart`. **Scan:** `camera` + `google_mlkit_text_recognition`.
- Money: store canonical value per printing = selected source/type (settings). USD default.

## Roadmap status (see ARCHITECTURE.md §8)
- Phase 0 data backend: DONE.
- Phase 1 search + price + detail: DONE (filters by set/rarity/foil, sort, card detail
  with full price table + printings selector + history chart).
- Phase 2 offline cache: user data offline via prefs. Catalog still queried live from
  Supabase (no drift mirror yet — TODO if offline catalog is needed).
- Phase 3 trade balancer + history: DONE (Have/Want + cash, live delta, Confirm Trade → history).
- Phase 4 collection & want lists: DONE, reworked as Phase 7 Binder (see below).
- Phase 5 scan: DONE, now VISUAL + OCR. The scanner fuses two offline signals per frame:
  (a) a 256-bit perceptual hash (pHash) of the card inside the guide rectangle, matched by
  Hamming distance against precomputed hashes of every catalog image (bundled asset), and
  (b) the existing ML Kit name/collector-number OCR. Candidates merged via Reciprocal Rank
  Fusion; two-consecutive-frame lock unchanged. See `docs/card-scanning-research.md` for
  the research behind the approach (this is "Phase 1" of that doc; Phase 2 = CLIP-style
  embeddings if foil/glare robustness demands it). Camera fails on the emulator; needs a
  real device to validate end-to-end.
  - Hash pipeline: `apps/mobile/lib/core/scan/phash.dart` (pure Dart, shared by app + tools),
    `card_hash_index.dart` (asset parse + outlier-test matching), `frame_hasher.dart`
    (camera frame → guide-rect hash; geometry contract with the scan overlay).
  - Asset: `apps/mobile/assets/scan/card_hashes.json` (~115 KB, 1169 images / 1598 printings).
    Regenerate per set release: `dart run tool/generate_card_hashes.dart` (caches images
    in `apps/mobile/tool/.cache/`, gitignored). ~184 promo images 403 on the TCGplayer CDN
    (mostly Organized Play promos) — those cards fall back to OCR-only scanning.
  - Robustness check: `dart run tool/verify_hash_robustness.dart` simulates camera noise
    on real card images; last run: 135/150 top-1, 7 in candidates, 8 rejected, 0 wrong.
- Phase 6 cloud sync: not started (optional).
- Phase 7 Binder (B1–B4): DONE. Collection renamed to Binder (tradeable stock);
  Want List lives inside Binder tab; Confirm Trade reconciles binder; scan-to-binder;
  filler boosts Binder/Want List; Own/Wanted pills. See `docs/BINDER-PLAN.md`. B5 deferred.

## App code map (lib/)
- `app/` — theme.dart, app.dart (HomeShell bottom nav; themeMode from settings),
  widgets.dart (SetLogoTitle, CardThumbnail, CardRow, PillBadge, RarityBadge),
  card_actions.dart (add-to sheet).
- `core/models/` — card_model.dart (+PricePoint), app_settings.dart (PriceSource +
  AppThemeMode), trade.dart, binder_entry.dart.
- `core/data/` — card_repository.dart (search/filters/printings/history/setNamesFrom),
  set_logos.dart / set_logo_cache.dart / set_published_on.dart, settings/
  binder/trade repositories (SharedPreferences JSON).
- `core/logic/pricing.dart` — market value + lowValue/lowPriceLabel (trade math = market).
- `core/logic/confirm_trade.dart` — pure binder reconcile after Confirm Trade.
- `core/logic/trade_filler.dart` — partitionFillerMatches (binder/want boost).
- `core/logic/set_sort.dart` — Main Sets vs Other, newest-first within tier.
- `core/providers.dart` — all Riverpod providers + notifiers (settings, catalog,
  setLogoMap, setPublishedOn, search, binder, trade history, live trade draft).
  NOTE: `sharedPreferencesProvider` is overridden in main().
- `features/` — search/ (Browse with set logos + sections), card_detail/, trade/
  (trade_screen + filler + history), binder/, want_list/ (WantListPane), lend/,
  scan/ (`ScanDestination`), settings/.
- Browse assets: `assets/setLogos.json`, `assets/setPublishedOn.json`,
  `assets/set_logos/*.png` (UVS marketing key-art; regen from retailer portal ZIPs).

## Gotchas / decisions made
- State mgmt: Riverpod 3.x (Notifier/NotifierProvider). No codegen.
- Do NOT put a nested `Scaffold.bottomNavigationBar` inside the IndexedStack tab screens —
  it expands to full height. Use a Column with the bar as the last child (see trade_screen).
- Trade draft is in-memory (resets on app restart, by design). Binder + trade history
  persist via SharedPreferences (binder key remains `collection_entries`).
- Android manifest: added CAMERA/INTERNET permissions + mlkit `ocr` DEPENDENCIES meta-data.
- Adding native plugins (camera/mlkit) requires a full `flutter run` rebuild, not hot reload.

## Current status / next steps
Phases 1–5 + Phase 7 Binder B1–B4 done. Collection language retired from the UI.
Scan Android safety: `camera_android` + R8 keep-rule relaxation.

Possible next steps: (a) Binder B5 (value-over-time, lend exclusion from filler),
(b) Supabase Auth + cloud sync (Phase 6), (c) real-device sleeved-binder scan validation.

## Android Play release (CI)
Manual workflow: `.github/workflows/release-android-closed.yml`
(`workflow_dispatch` → track/status/optional version overrides).

Required repo secrets (same shape as FAB Trades):
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`,
  `ANDROID_KEY_ALIAS` (optional, default `upload`)
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Play Android Publisher API access for
  `com.rifttrades.myapp`)

Leave `build_number` blank to auto-pick `max(Play versionCodes)+1`.
