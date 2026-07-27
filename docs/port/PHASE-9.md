# Phase 9 — Recent FAB Trades feature deltas

Port the post–Phase-5 FAB Trades mobile features that are not covered by
Phases 6–8: CardPicker multi-add, trade-history cash rows, the onboarding
tour, and the recent scan OCR / expand-to-printings work.

Prerequisite: Phase 8 is `Done`.

Source paths are relative to `e:\Downlaods\Downloads\fabtrades\apps\mobile`
unless noted. Target is `C:\Users\maxes\RiftTrades\apps\mobile`.

Read `CONVENTIONS.md` first. Never copy wholesale the files listed under
"Never copy wholesale" — edit them surgically. Never rename SharedPreferences
keys. Apply brand renames per file as you copy.

## Steps

### 1. CardPicker multi-add

Copy the multi-add API from the source `lib/features/search/card_picker.dart`
into the RiftTrades file (do **not** overwrite the whole file blindly — merge):

- `onPick` optional callback on `CardPickerScreen`
- `CardPickerScreen.showMulti(...)` that keeps the picker open after each add
- UI that shows "N added" while in multi mode

Wire `showMulti` from:

- `lib/features/binder/binder_screen.dart`
- `lib/features/want_list/want_list_screen.dart`
- `lib/features/lend/lend_group_screen.dart`
- `lib/features/trade/trade_screen.dart`

Each caller must go through the existing Pro free-tier gates
(`addToBinderOrUpsell` / equivalents in `pro_limits.dart` / `card_actions.dart`).
`onPick` returns `false` when the add was refused (cap / upsell) so the picker
does not count it.

Copy and adapt `test/widgets/card_picker_test.dart` from the source. Apply the
package rename.

### 2. Trade history cash rows

In `lib/features/trade/trade_history_screen.dart`, show `haveCash` / `wantCash`
when present (the model already has the fields). Model the row UI on the source
file's cash row, but **do not** port FAB Cold/Rainbow / `finishBadgeShort`
badges — use RiftTrades `finishLabel` (or existing finish display) only.

### 3. Onboarding tour

Copy the whole `lib/features/onboarding/` directory from the source, applying
`package:fabtrades/` → `package:rifttrades/` and brand renames in user-facing
copy (`FABTrades` → `RiftTrades`, etc.).

Add `showcaseview: 5.1.0` to `pubspec.yaml` (match the source version).

Wire surgically into the shells the source wired (read each RiftTrades file
first; do not overwrite):

- `lib/app/app.dart`
- `lib/features/binder/binder_screen.dart`
- `lib/features/lend/lend_screen.dart`
- `lib/features/scan/scan_screen.dart`
- `lib/features/trade/trade_screen.dart`
- `lib/features/want_list/want_list_screen.dart`
- `lib/features/settings/settings_screen.dart`
- `lib/features/sync/sync_host.dart`

New SharedPreferences key `onboarding_v1` (or whatever the source uses) is fine
to add. Do **not** rename any existing keys.

Copy tests under `test/features/onboarding/` and adapt harness/smoke/sync_host
tests the same way the source commit did. Suppress sync during tours.

### 4. Scan OCR guide filter + expand-to-printings

Port these portable pieces from the source:

| Source | What to take |
| --- | --- |
| `lib/core/scan/ocr_guide_filter.dart` | Copy + package rename |
| `lib/core/scan/phash.dart` | `guideRectInRotatedFrame`, `kCardTitleBandFraction` (retune if Riftbound art needs it; start with the source values and note any change) |
| `lib/core/scan/frame_hasher.dart` | Guide-rect / OCR-related updates only — surgical |
| `lib/core/data/card_repository.dart` | `ScanMatches`, `expandScanMatchesToPrintings`, and wiring into identify — surgical merge |
| `lib/features/scan/scan_screen.dart` | OCR guide filter path — surgical |

**Do not port** these FAB-specific pieces:

- Token-card OCR suppression (`isTokenCard`, `tokenNameKeys`, token candidate gating)
- FAB set-code OCR promotion (`FAB428`, `_isSetCodeKey`, promo name `- SETCODE` stripping)
- Flesh and Blood collector-number conventions that do not apply to Riftbound

Keep RiftTrades' existing number-first identify behaviour. Expand matches by
shared base card name / printings using Riftbound catalog fields
(`baseCardName` or the local equivalent).

Copy/adapt tests:

- `test/core/scan/ocr_guide_filter_test.dart`
- relevant new cases in `phash_test.dart` / `card_scan_test.dart`

Skip `token_identify_test.dart` unless Riftbound has an equivalent need (it
does not — do not add it).

Optional: adapt `docs/mobile/card-scanning-learnings.md` or
`apps/mobile/docs/scan-diagnostics.md` only if the content is true for
Riftbound after your changes. Do not copy FAB-only diagnostics blindly.

## Verify

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count did not drop (baseline after Phase 8: 404 unit + 4 integration;
      onboarding and picker/scan tests should raise it)
- [ ] No `fabtrades` / `FABTrades` strings in new or edited Dart under `lib/`:

```powershell
Select-String -Path lib -Include *.dart -Pattern "fabtrades|FABTrades"
```

- [ ] Existing SharedPreferences keys unchanged (still exactly the literals in
      `CONVENTIONS.md` "Never change")
- [ ] Onboarding prefs key is new, not a rename of an existing key
- [ ] No token-scan or FAB set-code promotion APIs in `card_repository.dart`

## Commit

Prefer one commit per slice if you land them separately; otherwise one commit
covering the phase:

```powershell
git add -A
git commit -m "Port onboarding, multi-add, and scan guide matching from FAB Trades"
```

Set Phase 9 to `Done` in `docs/port/README.md` in the commit that finishes the
last slice.
