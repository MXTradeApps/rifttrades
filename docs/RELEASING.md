# Releasing

Mobile ships from one tag. There is no web app to coordinate.

## Mobile

```bash
# Set the version in apps/mobile/pubspec.yaml first, and merge it.
git tag mobile-v1.2.0
git push origin mobile-v1.2.0
```

That single tag drives both stores:

| Pipeline | Trigger | Result |
| --- | --- | --- |
| `.github/workflows/release-android-closed.yml` | `mobile-v*` tag | Signed AAB → Play closed testing (`alpha`) |
| `codemagic.yaml` → `ios-testflight` | `mobile-v*` tag | Signed IPA → TestFlight |

`ios-unsigned` is not tag-triggered; it stays a debug / no-codesign check.

### Identifiers

| Platform | Value | Notes |
| --- | --- | --- |
| Android `applicationId` | `com.rifttrades.myapp` | Published — **cannot change** |
| Android Gradle namespace | `com.rifttrades.rifttrades` | Differs from the Play id on purpose |
| iOS bundle id | `com.rifttrades.rifttrades` | App Store Connect / Codemagic signing |

### Why one tag

The two stores used to ship from a Codemagic UI button and a manual dispatch, which
meant they could carry **different commits under the same version string**. That was
tolerable for a free calculator. It is not once a subscription decides what the code
does: a customer reporting that Pro does not unlock on Android, at version 1.2.0,
tells you nothing if Android's 1.2.0 is not the same code as iOS's.

### What the tag must not disagree with

`apps/mobile/pubspec.yaml` is the source of truth for the version name. Both pipelines
run `scripts/check-release-tag.sh` before doing any real work, and both fail if the tag
does not name the pubspec version (the part before `+`).

Pattern: `mobile-vMAJOR.MINOR.PATCH` — **no** build number in the tag.

The check exists because nothing downstream performs it. Play and App Store Connect
each take whatever version they are handed, so `mobile-v1.2.0` carrying a binary that
says `1.1.0` ships silently and is then permanent — neither store lets a version be
reused. `scripts/check-release-tag.test.sh` covers the check itself.

Build numbers are deliberately absent from the tag. Play auto-increments from the
highest `versionCode` it has seen, and Codemagic from the latest TestFlight build, so
they are properties of an upload rather than of a release.

### Codemagic webhook

Codemagic only hears about tags if the GitHub webhook includes **tag** events
(Codemagic → App settings → Webhooks, or the GitHub webhook delivery settings).
Without that, Android still builds from the tag and iOS silently does not. Starting
a build from the Codemagic UI remains available as an escape.

### Builds that are not releases

Both pipelines still build on demand:

- **Android** — run the workflow manually (Actions → Release Android → Run workflow).
  Choose the track, and choose `staging` to point the build at the staging Supabase
  project. On a tag, the inputs are absent and it defaults to `alpha`, `completed`, and
  `production`, so a sandbox purchase can never reach production entitlements by
  accident.
- **iOS** — start a build in Codemagic. With no tag, the version check reports that
  there is nothing to check and the build proceeds. Override `APP_ENVIRONMENT` in the
  UI for a staging TestFlight build.

A manual build has no tag, so nothing enforces that the two stores agree. That is fine
for a test build and is the reason releases go through the tag.

### After the tag

1. Watch both pipelines. The Android upload and the TestFlight submission are the two
   places a release actually fails. If only Android ran, check the Codemagic webhook
   includes tag events.
2. Bump `version:` in `apps/mobile/pubspec.yaml` for the next release, so `main` is
   never sitting on a version that has already shipped.

## Local release-shaped builds

Always pass an env file. Run from `apps/mobile`:

```powershell
flutter build appbundle --release --dart-define-from-file=env/production.json
flutter build ipa --release --dart-define-from-file=env/production.json
```
