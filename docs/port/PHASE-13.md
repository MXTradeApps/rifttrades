# Phase 13 — Mobile free-limit parity (50 / 50)

Raise the mobile free-tier binder and want-list caps to match the web values
ported in Phase 11 (and FAB Trades this morning). Without this, a free user can
add 50 distinct cards on web and then watch mobile refuse or look inconsistent.

Prerequisite: none beyond Phase 9 being `Done`. Safe to run in parallel with
Phases 10–12, but caps must match web before shipping the web binder to users.

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
| `FreeLimits.wantListCards` | `4` | `50` |

Leave `loanedCards` at `1` and `savedTrades` at `3`.

Update the file's doc comments if they still describe the old numbers as if they
were fixed product policy without mentioning the new ceilings.

### 2. Update mobile tests that pin the old numbers

Edit `apps/mobile/test/core/providers/free_limits_test.dart` (and any other test
that asserts the literal `5` / `4` for these caps):

- Change expectations that read `expect(FreeLimits.binderCards, 5)` → `50`
- Change expectations that read `expect(FreeLimits.wantListCards, 4)` → `50`

Tests that loop `for (var i = 0; i < FreeLimits.binderCards; i++)` do **not**
need logic changes — they already use the constant. Only literal pins need
edits.

Search for other literals:

```bash
rg -n "binderCards, 5|wantListCards, 4|FreeLimits\\.binderCards, 5|FreeLimits\\.wantListCards, 4" apps/mobile
```

Also check docs/comments under `apps/mobile` and `docs/` that still say
"5 binder" / "4 want" as the live free caps.

### 3. Update `docs/port/CONVENTIONS.md` caps table

In `CONVENTIONS.md`, under **Free-tier limits**, set:

| Cap | Value |
| --- | --- |
| `binderCards` | 50 |
| `wantListCards` | 50 |

Leave `loanedCards` / `savedTrades` unchanged. If `WEB-CONVENTIONS.md` already
says 50/50, leave it — they must agree.

## Verify

From `/Users/joseescaler/Documents/rifttrades/apps/mobile`:

```bash
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count did not drop (baseline after Phase 9 — count must only go up or
      stay equal)
- [ ] `FreeLimits.binderCards == 50` and `FreeLimits.wantListCards == 50` in
      `free_limits.dart`
- [ ] `docs/port/CONVENTIONS.md` caps table matches
- [ ] `docs/port/WEB-CONVENTIONS.md` caps table still says 50/50
- [ ] No remaining test asserts binder `5` or want `4` as the free cap

## Commit

In the mobile monorepo:

```bash
git add apps/mobile/lib/core/logic/free_limits.dart \
        apps/mobile/test \
        docs/port/CONVENTIONS.md \
        docs/port/README.md
git commit -m "Raise free binder and want-list caps to 50"
```

Set Phase 13 to `Done` in `docs/port/README.md` in the same commit.
