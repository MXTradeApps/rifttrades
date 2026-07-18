# Changelog

All notable changes to the RiftTrades mobile app are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project tracks versions via `app/pubspec.yaml` (`version: name+build`).

## [Unreleased]

### Added

- **Visual + OCR live scanner (Phase 1).** Each camera frame fuses two offline
  signals: a 256-bit perceptual hash (pHash) of the card inside the guide
  rectangle, matched against bundled catalog hashes, and ML Kit name /
  collector-number OCR. Candidates merge via Reciprocal Rank Fusion (RRF).
- Bundled visual index: `assets/scan/card_hashes.json` (~1,169 images /
  ~1,598 printings). Regenerate after set releases with
  `dart run tool/generate_card_hashes.dart`.
- Card-region **rectification** before hashing (`lib/core/scan/rectify.dart`)
  for offset / scale / modest tilt; defers to the fixed guide crop when the
  card already fills the frame.
- Offline **accuracy harness** (`tool/evaluate_scan.dart`) and hash robustness
  check (`tool/verify_hash_robustness.dart`).
- Collector-number bonus in RRF fusion when OCR reads an `NNN/TTT`-style number.
- On-device `[DEBUG-scan]` diagnostics for Pixel / real-device debugging.
- Trade **filler suggestions** sheet (`trade_filler_sheet.dart`) — suggests
  catalog cards near the current value gap.
- **Browse set key-art** from UVS retailer marketing packs (`assets/set_logos/`,
  `setLogos.json`), with process-lifetime image pin/cache so logos stay painted
  after set drill-in / Settings.
- **Browse sections + newest-first sort** via `setPublishedOn.json` +
  `set_sort.dart` (Main Sets vs Other / promos).
- Settings **Dark mode** toggle (`AppThemeMode`).
- Dual **market + low** price display across browse, trade, collection, lend,
  picker, and scan (trade math always uses market/trend).
- GitHub Action **Release Android (Play Closed Testing)** —
  `.github/workflows/release-android-closed.yml` — builds a signed AAB and
  uploads to Play; auto-increments `versionCode` from the highest code already
  on Play (manual override optional).

### Changed

- Two-frame auto-lock now confirms on a **stripped card name** (parentheticals
  removed), not printing `id`, so foil / set / alternate-art variants no longer
  flip the gate forever.
- Scanner tolerates **1–2 empty OCR frames** while a pending read is in flight
  (real Pixel OCR flickers between good reads).
- OCR failures are **isolated** from the visual path — an ML Kit
  `PlatformException` no longer discards a whole frame.
- Name matching prefers **longer token matches** (e.g. `"Ahri - Inquisitive"`
  outranks bare `"Ahri"`).
- Browse set list no longer shows per-set card counts; rows use taller logo
  plates instead.
- Removed the Market/Low **price-type toggle** — low is always shown as a
  secondary line; trade values use market/trend.
- Android build: ProGuard rules + ML Kit NV21 single-plane contract for release.
- App version bumped to **1.0.0+3**.

### Fixed

- Real-device lock failures where OCR was reading correctly but the confirmation
  key kept resetting (printing-id flip + empty-frame wipes).
- Release-build cases where ML Kit exceptions aborted visual matching entirely.

### Known limitations

- Live phone pHash still rarely wins the fuse (Hamming / z-score below the 5σ
  gate). OCR + two-frame confirm is the reliable path today; visual matching
  needs a phone-quality follow-up (see `docs/card-scanning-learnings.md`).
- ~184 promo images 403 on the TCGplayer CDN — those printings fall back to
  OCR-only scanning.
- Emulator still has no camera; validate on a physical device before store push.

### Docs

- `docs/card-scanning-research.md` — approach research (Phase 1 pHash → Phase 2
  embeddings if needed).
- `docs/card-scanning-learnings.md` — Pixel 6a debug lessons ported from FAB
  Trades and applied here.

---

## [1.0.0+1] — earlier MVP baseline

### Added

- Live streaming ML Kit OCR scanner with two-frame auto-lock, torch, and manual
  name/number fallback.
- Trade-integrated scan mode (“Scan a card to add”) that keeps scanning after
  each add.
- Browse, Trade balancer, Want List, Lend, Collection, Settings, Card Detail
  (see repo `context.md` and MyBrain vault notes for the full feature set).
