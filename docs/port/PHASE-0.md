# Phase 0 — Repo restructure

Move the Flutter app to `apps/mobile` and the pipeline to
`services/price-pipeline`, so paths match FAB Trades and every future port lines
up. **Nothing else goes in this commit.** No new features, no new files beyond
the moves.

Prerequisite: none. This is the first phase.

## Steps

### 1. Confirm a clean starting point

```powershell
git status --short
```

Expect no output except possibly untracked files under `docs/`. If there are
modified tracked files, stop and ask — do not stash or discard someone's work.

### 2. Record the test baseline

Working directory: `C:\Users\maxes\RiftTrades\app`

```powershell
flutter test
```

Write down the number of passing tests. It should be **224**. If it is not, stop
and report the number you got — the baseline in `CONVENTIONS.md` is wrong or
something is already broken, and you need to know that before you move files.

### 3. Move the two directories

Working directory: `C:\Users\maxes\RiftTrades`

Use `git mv` so history follows the files. Create the parents first.

```powershell
New-Item -ItemType Directory -Force -Path apps, services
git mv app apps/mobile
git mv pipeline services/price-pipeline
git status --short
```

`git status` should show renames (`R`) and no deletions (`D`) of source files.

### 4. Delete the empty leftover directory

```powershell
Remove-Item -Recurse -Force apps/mobile/lib/features/collection -ErrorAction SilentlyContinue
```

This directory is empty — a leftover from the binder rework. If it turns out to
contain files, stop and ask; do not delete files.

### 5. Update `codemagic.yaml`

Two `working_directory` values and one comment.

- Line ~2: `# Flutter project lives at app/` → `# Flutter project lives at apps/mobile/`
- Line ~17: `working_directory: app` → `working_directory: apps/mobile`
- Line ~38: `working_directory: app` → `working_directory: apps/mobile`

**Do not change line ~33**, `- build/ios/iphoneos/**/*.app`. That `.app` is an
iOS bundle extension, not a directory path.

### 6. Update `.github/workflows/update-prices.yml`

Two occurrences:

- `working-directory: pipeline` → `working-directory: services/price-pipeline`

### 7. Update `.github/workflows/release-android-closed.yml`

This file has about 9 path references. Read the whole file, then change every
path that points at the Flutter app from `app/...` to `apps/mobile/...`, and any
`working-directory: app` to `working-directory: apps/mobile`.

Be careful with these, which are **not** repo paths and must not change:

- `android/app/...` — a directory inside the Flutter project
- `app-release.aab`, `*.aab`, `appbundle` — build artifact names
- Anything containing `applicationId`, `app_name`, or `APP_` — identifiers

After editing, list every line you changed so it can be reviewed.

### 8. Update the docs that reference the old paths

Change `app/` → `apps/mobile/` and `pipeline/` → `services/price-pipeline/` in:

```
README.md
CHANGELOG.md
context.md
docs/ARCHITECTURE.md
docs/BINDER-PLAN.md
docs/DATABASE.md
docs/browse-features-context.md
docs/card-scanning-learnings.md
docs/card-scanning-research.md
```

Skip `docs/PORT_PLAN.md` and everything in `docs/port/` — those already describe
the post-rename layout.

In prose, only change strings that are genuinely file paths. Sentences like "the
app reads prices from Supabase" contain the word "app" and must be left alone.

## Verify

Working directory: `C:\Users\maxes\RiftTrades\apps\mobile`

```powershell
flutter analyze
flutter test
```

Both must pass, with the **same test count as step 2** (224). A drop means a
moved file lost a reference.

Then, from `C:\Users\maxes\RiftTrades`:

```powershell
git status --short
Get-ChildItem -Force -Name
```

Checks:

- [ ] `flutter analyze` is clean
- [ ] `flutter test` passes with 224 tests
- [ ] Root listing shows `apps` and `services`, and no longer `app` or `pipeline`
- [ ] No remaining reference to the old paths:

```powershell
Select-String -Path .github\workflows\*.yml,codemagic.yaml -Pattern "working.directory: *app$|working.directory: *pipeline$"
```

That must return nothing.

## Commit

```powershell
git add -A
git commit -m "Move the app and pipeline to monorepo paths"
```

Then set Phase 0 to `Done` in `docs/port/README.md` and commit that too.

## If something goes wrong

The whole phase is reversible before you commit:

```powershell
git reset --hard HEAD
```

That is safe here **only** because step 1 confirmed a clean tree. If you have
since created untracked files you want to keep, move them out first.
