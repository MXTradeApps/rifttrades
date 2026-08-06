# Phase 13 — Mobile free-limit raise (50 / 25 / 25)

Raise the mobile free-tier binder, want-list, and loaned-card caps so free users
are not stuck on the old 5 / 4 / 1 ceilings. Web and mobile must agree on the
same numbers (see [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md)).

Prerequisite: none beyond Phase 9 being `Done`. Safe to run in parallel with
Phases 10–12.

This phase edits the **mobile monorepo only**.

Target: `/Users/joseescaler/Documents/rifttrades`
Flutter app: `apps/mobile`

Read [`CONVENTIONS.md`](CONVENTIONS.md). Do not rename SharedPreferences keys.

## Steps

### 1. Raise caps in `free_limits.dart`

Edit `apps/mobile/lib/core/logic/free_limits.dart`:

| Constant | Old | New |
| --- | --- | --- |
| `FreeLimits.binderCards` | `5` | `50` |
| `FreeLimits.wantListCards` | `4` | `25` |
| `FreeLimits.loanedCards` | `1` | `25` |

Leave `savedTrades` at `3`.

Update the file's doc comments if they still describe the old numbers as if they
were fixed product policy without mentioning the new ceilings.

### 2. Update mobile tests that pin the old numbers

Edit `apps/mobile/test/core/providers/free_limits_test.dart` (and any other test
that asserts the literal `5` / `4` / `1` for these caps):

- Change expectations that read `expect(FreeLimits.binderCards, 5)` → `50`
- Change expectations that read `expect(FreeLimits.wantListCards, 4)` → `25`
- Change expectations that read `expect(FreeLimits.loanedCards, 1)` → `25`

Tests that loop `for (var i = 0; i < FreeLimits.binderCards; i++)` do **not**
need logic changes — they already use the constant. Only literal pins need
edits.

Search for other literals:

```bash
rg -n "binderCards, 5|wantListCards, 4|loanedCards, 1|FreeLimits\\.binderCards, 5|FreeLimits\\.wantListCards, 4|FreeLimits\\.loanedCards, 1" apps/mobile
```

Also check docs/comments under `apps/mobile` and `docs/` that still say
"5 binder" / "4 want" / "1 loaned" as the live free caps.

### 3. Update `docs/port/CONVENTIONS.md` caps table

In `CONVENTIONS.md`, under **Free-tier limits**, set:

| Cap | Value |
| --- | --- |
| `binderCards` | 50 |
| `wantListCards` | 25 |
| `loanedCards` | 25 |

Leave `savedTrades` unchanged. `WEB-CONVENTIONS.md` must say the same
50 / 25 / 25 — they must agree.

## Verify

From `/Users/joseescaler/Documents/rifttrades/apps/mobile`:

```bash
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [x] `FreeLimits.binderCards == 50`, `wantListCards == 25`, and
      `loanedCards == 25` in `free_limits.dart`
- [x] `docs/port/CONVENTIONS.md` caps table matches
- [x] `docs/port/WEB-CONVENTIONS.md` caps table says 50 / 25 / 25
- [x] No remaining test asserts binder `5`, want `4`, or loaned `1` as the free
      cap

## Commit

In the mobile monorepo:

```bash
git add apps/mobile/lib/core/logic/free_limits.dart \
        apps/mobile/test \
        docs/port/CONVENTIONS.md \
        docs/port/WEB-CONVENTIONS.md \
        docs/port/README.md \
        docs/port/PHASE-13.md
git commit -m "Raise free caps to binder 50, want 25, loaned 25"
```

Set Phase 13 to `Done` in `docs/port/README.md` in the same commit.
