# Phase 8 — Remaining UI parity and docs

Pick up the four small shared widgets from the source repo and bring the docs in
line with what the port actually built.

Prerequisite: Phase 5 is `Done`.

## Steps

### 1. Copy the four widgets

All four are game-neutral — they deal with foil, sorting, image fallback, and set
codes, none of which are Flesh and Blood concepts. Copy them and apply the import
rename.

| Source | Lines | What it is |
| --- | --- | --- |
| `lib/app/card_filter_bar.dart` | 99 | Foil toggle and sort chips shared by Browse and Binder |
| `lib/app/fallback_network_image.dart` | 59 | Network image with a placeholder on failure |
| `lib/app/printing_picker.dart` | 114 | Sheet for choosing between printings of a card |
| `lib/core/logic/set_abbreviation.dart` | 59 | Derives a short set code from a set name |

### 2. Fix `printing_picker.dart` — it will not compile as copied

The source calls two `CardModel` getters that **do not exist** in RiftTrades:

```dart
    final version = card.setVersionLabel;   // does not exist here
    final foil = card.finishBadgeLabel;     // does not exist here
```

RiftTrades' `CardModel` has `finishLabel` (line ~151) and neither of the others.
This is not an oversight to correct by adding them: `setVersionLabel` distinguishes
Flesh and Blood's First Edition from Unlimited printings, and Riftbound has no such
distinction.

So collapse the label function to use what exists:

```dart
String printingLabel(CardModel card) => card.finishLabel;
```

Then delete anything left unused. Do not add `setVersionLabel` or
`finishBadgeLabel` to RiftTrades' `CardModel` to make the copy compile.

### 3. Wire the widgets in

None of these do anything until they are used:

- `CardFilterBar` — replace the hand-rolled filter chips in
  `lib/features/browse/` and `lib/features/binder/binder_screen.dart`. Read what
  is there first; if the existing chips already carry Riftbound-specific filters,
  keep those and only adopt the shared widget's structure.
- `FallbackNetworkImage` — use wherever a card image is loaded from the network.
- `printingPicker` — use from the card detail screen where a card has multiple
  printings.
- `setAbbreviation` — use where a set code is displayed.

If any of these has no natural call site in RiftTrades, **do not force it**. Skip
it and say which you skipped and why. An unused widget is worse than a missing
one.

### 4. Update the docs

| File | What to add |
| --- | --- |
| `docs/ARCHITECTURE.md` | Auth, sync, and entitlements; the sync merge rule; the single-accessor rule for Pro |
| `docs/DATABASE.md` | The `rift_*` tables, their RLS, and the shared-project ownership split |
| `README.md` | The `--dart-define-from-file` flag on every build command; the new repo layout |
| `context.md` | New directory layout, and the free-tier limits |
| `CHANGELOG.md` | One entry covering the port |

Create these as new files:

| File | What it covers |
| --- | --- |
| `docs/ENVIRONMENTS.md` | The two projects, which is which, how to build for each, and that staging is `fabloodle` (`cnmxaccamqshgvesieez`) |
| `docs/ENTITLEMENTS.md` | The purchase-to-access path, the webhook, the nightly sweep, and how to debug someone reporting missing Pro |
| `docs/RELEASING.md` | The `mobile-v*` tag flow and the tag-versus-pubspec check |

Use the source repo's equivalents as models where they exist, but every statement
must be true of **RiftTrades**. Do not copy sentences describing a web app, a
`packages/contracts` directory, or Flesh and Blood.

### 5. Record the two known gaps

Both are inherited from the source and neither is a bug introduced here, but both
will generate support questions. Write them down in `docs/ARCHITECTURE.md` under a
"Known gaps" heading:

- **Sync runs once per launch.** No timer, no resume hook, no push-on-write. The
  failure message says it "will sync when the connection recovers", which is not
  what the code does — it retries on next launch. Either soften the copy or add a
  resume hook; do not leave the copy claiming something untrue.
- **The trade-history trim is retroactive.** A free user with more than three
  saved trades from before this shipped loses the excess the first time they save
  a trade. Phase 5's fix stops it happening when the entitlement is *unknown*, but
  a genuinely-free user still loses history.

## Verify

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean, with **no unused-import or dead-code warnings** —
      those would mean a widget was copied but never wired up
- [ ] Test count did not drop
- [ ] No stale path references:

```powershell
Select-String -Path README.md,context.md,CHANGELOG.md,docs\*.md -Pattern "(^|[^a-z/])app/|pipeline/"
```

  Only `docs/PORT_PLAN.md` and `docs/port/*` may appear.

- [ ] Every documented build command carries the env flag:

```powershell
Select-String -Path README.md,context.md,docs\*.md -Pattern "flutter (run|build)"
```

  Every hit must include `--dart-define-from-file`.

- [ ] No FAB vocabulary leaked into the docs:

```powershell
Select-String -Path README.md,context.md,docs\*.md -Pattern "fabtrades|FABTrades|Flesh and Blood|pitch value"
```

  Only `docs/PORT_PLAN.md` and `docs/port/*` may appear — they legitimately
  discuss the source repo.

## Commit

```powershell
git add -A
git commit -m "Adopt the shared card widgets and document the port"
```

Set Phase 8 to `Done` in `docs/port/README.md`.

## After this phase

The port is complete. Re-read the "Human tasks that block phases" table in
`docs/port/README.md` and confirm every one is done, because several phases can be
committed green while still being unverifiable without them.
