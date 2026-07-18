# RiftTrades — Agent Handoff Context

Living handoff doc so any agent can pick up where the last left off. Keep it updated
as you finish work. This complements `docs/ARCHITECTURE.md` (the plan) and
`docs/DATABASE.md` (the shared DB schema).

## What this is
Cross-platform (Android + iOS) Flutter app for trading **Riftbound** cards, inspired by
**MTG Trades**: price lookup, trade balancing, collection/want lists, card scanning.
Reads from a shared **Supabase** DB populated daily by `pipeline/` (Node + GitHub Action).

## Repo layout
- `pipeline/` — Node ingest (TCGCSV + CardMarket → Supabase). DONE + running daily.
- `app/` — the Flutter app (this is the active work).
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
  cd C:\Users\maxes\RiftTrades\app; flutter run -d emulator-5554
  ```
- Screenshot: `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png out.png`
  (don't use PowerShell `>` redirect for binary — it corrupts the PNG).
- GitHub repo: https://github.com/Max-Escaler/rifttrades

## Architecture decisions for the app
- **State:** `flutter_riverpod` (no codegen).
- **Persistence (user data):** `shared_preferences` storing JSON for settings, collection,
  and trade history (small data, fully offline). Card catalog comes from Supabase (+
  `cached_network_image` for art). Heavier drift/sqflite intentionally avoided for now.
- **Navigation:** bottom nav shell (Search / Trade / Collection / Scan) via IndexedStack;
  Settings + card detail are pushed routes.
- **Charts:** `fl_chart`. **Scan:** `camera` + `google_mlkit_text_recognition`.
- Money: store canonical value per printing = selected source/type (settings). USD default.

## Roadmap status (see ARCHITECTURE.md §8)
- Phase 0 data backend: DONE.
- Phase 1 search + price + detail: DONE (filters by set/rarity/foil, sort, card detail
  with full price table + printings selector + history chart).
- Phase 2 offline cache: user data offline via prefs. Catalog still queried live from
  Supabase (no drift mirror yet — TODO if offline catalog is needed).
- Phase 3 trade balancer + history: DONE (Have/Want + cash, live delta, save → history).
- Phase 4 collection & want lists: DONE (owned/want tabs, totals, condition, qty, swipe-delete).
- Phase 5 scan: DONE, now VISUAL + OCR. The scanner fuses two offline signals per frame:
  (a) a 256-bit perceptual hash (pHash) of the card inside the guide rectangle, matched by
  Hamming distance against precomputed hashes of every catalog image (bundled asset), and
  (b) the existing ML Kit name/collector-number OCR. Candidates merged via Reciprocal Rank
  Fusion; two-consecutive-frame lock unchanged. See `docs/card-scanning-research.md` for
  the research behind the approach (this is "Phase 1" of that doc; Phase 2 = CLIP-style
  embeddings if foil/glare robustness demands it). Camera fails on the emulator; needs a
  real device to validate end-to-end.
  - Hash pipeline: `app/lib/core/scan/phash.dart` (pure Dart, shared by app + tools),
    `card_hash_index.dart` (asset parse + outlier-test matching), `frame_hasher.dart`
    (camera frame → guide-rect hash; geometry contract with the scan overlay).
  - Asset: `app/assets/scan/card_hashes.json` (~115 KB, 1169 images / 1598 printings).
    Regenerate per set release: `dart run tool/generate_card_hashes.dart` (caches images
    in `app/tool/.cache/`, gitignored). ~184 promo images 403 on the TCGplayer CDN
    (mostly Organized Play promos) — those cards fall back to OCR-only scanning.
  - Robustness check: `dart run tool/verify_hash_robustness.dart` simulates camera noise
    on real card images; last run: 135/150 top-1, 7 in candidates, 8 rejected, 0 wrong.
- Phase 6 cloud sync: not started (optional).

## App code map (lib/)
- `app/` — theme.dart, app.dart (HomeShell bottom nav; themeMode from settings),
  widgets.dart (SetLogoTitle, CardThumbnail, CardRow, PillBadge, RarityBadge),
  card_actions.dart (add-to sheet).
- `core/models/` — card_model.dart (+PricePoint), app_settings.dart (PriceSource +
  AppThemeMode), trade.dart, collection_entry.dart.
- `core/data/` — card_repository.dart (search/filters/printings/history/setNamesFrom),
  set_logos.dart / set_logo_cache.dart / set_published_on.dart, settings/
  collection/trade repositories (SharedPreferences JSON).
- `core/logic/pricing.dart` — market value + lowValue/lowPriceLabel (trade math = market).
- `core/logic/set_sort.dart` — Main Sets vs Other, newest-first within tier.
- `core/providers.dart` — all Riverpod providers + notifiers (settings, catalog,
  setLogoMap, setPublishedOn, search, collection, trade history, live trade draft).
  NOTE: `sharedPreferencesProvider` is overridden in main().
- `features/` — search/ (Browse with set logos + sections), card_detail/, trade/
  (trade_screen + filler + history), collection/, lend/, scan/, settings/.
- Browse assets: `assets/setLogos.json`, `assets/setPublishedOn.json`,
  `assets/set_logos/*.png` (UVS marketing key-art; regen from retailer portal ZIPs).

## Gotchas / decisions made
- State mgmt: Riverpod 3.x (Notifier/NotifierProvider). No codegen.
- Do NOT put a nested `Scaffold.bottomNavigationBar` inside the IndexedStack tab screens —
  it expands to full height. Use a Column with the bar as the last child (see trade_screen).
- Trade draft is in-memory (resets on app restart, by design). Collection + trade history
  persist via SharedPreferences.
- Android manifest: added CAMERA/INTERNET permissions + mlkit `ocr` DEPENDENCIES meta-data.
- Adding native plugins (camera/mlkit) requires a full `flutter run` rebuild, not hot reload.

## Current status / next steps
All planned phases (1–5) implemented and verified on the emulator (screenshots taken of
search, detail, trade, collection, scan, settings). Analyzer clean. Committed + pushed.

Possible next steps: (a) drift offline catalog mirror (Phase 2 full), (b) Supabase Auth +
cloud sync (Phase 6), (c) group search results by card name with a printings expander,
(d) real-device OCR validation, (e) app icon + splash + store metadata.

## Android Play release (CI)
Manual workflow: `.github/workflows/release-android-closed.yml`
(`workflow_dispatch` → track/status/optional version overrides).

Required repo secrets (same shape as FAB Trades):
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`,
  `ANDROID_KEY_ALIAS` (optional, default `upload`)
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Play Android Publisher API access for
  `com.rifttrades.myapp`)

Leave `build_number` blank to auto-pick `max(Play versionCodes)+1`.
