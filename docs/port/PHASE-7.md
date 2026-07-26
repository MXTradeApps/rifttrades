# Phase 7 — One release tag for both stores

Today Android ships from a manual `workflow_dispatch` and iOS from a manual
Codemagic trigger, so the two stores can carry the same version number while
running different code. That is tolerable for a free app and not tolerable once
Pro behaviour depends on the exact build.

After this phase, one `mobile-v*` tag builds and ships both.

Prerequisite: Phase 5 is `Done`.

## Steps

### 1. Add `scripts/check-release-tag.sh`

Copy from `e:\Downlaods\Downloads\fabtrades\scripts\check-release-tag.sh`. It:

- expects a tag of the form `mobile-vMAJOR.MINOR.PATCH`, with no build number
- strips a leading `refs/tags/`
- compares against the `version:` name in `pubspec.yaml` (the part before `+`)
- exits 1 on mismatch, 2 on usage error or a missing pubspec

Change only the path to `pubspec.yaml`, which is now `apps/mobile/pubspec.yaml`.

### 2. Add `scripts/check-release-tag.test.sh`

Copy the source's test file. It covers valid and invalid tags, fully-qualified
refs, prerelease rejection, and parsing the real `pubspec.yaml`.

Run it:

```powershell
bash scripts/check-release-tag.test.sh
```

If `bash` is unavailable, report it — do not rewrite the script in PowerShell.
Both CI runners and Codemagic run bash, so the script must stay bash.

### 3. Wire the tag into the mobile CI job

In `.github/workflows/ci.yml`, add `bash scripts/check-release-tag.test.sh` to the
`mobile` job. The script is release infrastructure and a silent break in it would
only surface at release time.

### 4. Trigger the Android release from the tag

In `.github/workflows/release-android-closed.yml`, add to the existing
`workflow_dispatch`:

```yaml
on:
  push:
    tags:
      - 'mobile-v*'
  workflow_dispatch:
    # existing inputs stay exactly as they are
```

Then, as the **first** step of the build job, guarded to tag pushes only:

```yaml
      - name: Check the tag matches pubspec
        if: startsWith(github.ref, 'refs/tags/')
        run: bash scripts/check-release-tag.sh "${{ github.ref }}"
```

Defaults for a tag push, where the dispatch inputs are empty: track `alpha`,
status `completed`, environment `production`.

Leave the existing `versionCode` auto-increment from the Play API alone. Build
numbers stay store-assigned and are not in the tag.

### 5. Trigger the iOS release from the same tag

In `codemagic.yaml`, on the `ios-testflight` workflow, add a tag trigger:

```yaml
    triggering:
      events:
        - tag
      tag_patterns:
        - pattern: 'mobile-v*'
          include: true
```

Add the tag check as the first script step, using Codemagic's `$CM_TAG`:

```yaml
      - name: Check the tag matches pubspec
        script: |
          if [ -n "$CM_TAG" ]; then
            bash scripts/check-release-tag.sh "$CM_TAG"
          fi
```

Note `working_directory` for this workflow is `apps/mobile`, so the script path
needs to reach the repo root. Check how the source repo handles this and match it.

Leave `ios-unsigned` untriggered by tags.

## Verify

```powershell
bash scripts/check-release-tag.test.sh
```

Checks:

- [ ] The test script passes
- [ ] A deliberately wrong tag is rejected. With `pubspec.yaml` at `1.0.0`:

```powershell
bash scripts/check-release-tag.sh "mobile-v9.9.9"
```

  Must exit non-zero. Then:

```powershell
bash scripts/check-release-tag.sh "mobile-v1.0.0"
```

  Must exit zero. A check that cannot fail is not a check.

- [ ] Both pipelines reference the tag pattern:

```powershell
Select-String -Path .github\workflows\release-android-closed.yml,codemagic.yaml -Pattern "mobile-v"
```

  Both files must appear.

### Manual check — needs a human

Codemagic only fires on tags if its GitHub webhook is configured for tag events.
That is a dashboard setting and cannot be verified from here. Ask for
confirmation; if it is not set, the iOS half silently will not run.

Do not test by pushing a real tag to `main`. Use a throwaway tag on a branch, or
confirm by inspection.

## Identifier warning

Before a real release, confirm these are each correct in their own place. They
genuinely differ and are easy to cross-wire once:

| Where | Value |
| --- | --- |
| Android `applicationId` (Play listing) | `com.rifttrades.myapp` |
| Android Gradle namespace | `com.rifttrades.rifttrades` |
| iOS bundle id (App Store, RevenueCat, Apple Services ID) | `com.rifttrades.rifttrades` |

The Android id is published and cannot be changed. Do not "fix" the mismatch.

## Commit

```powershell
git add -A
git commit -m "Cut mobile releases from one tag"
```

Set Phase 7 to `Done` in `docs/port/README.md`.
