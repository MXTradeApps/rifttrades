# Phase 2 — Build-time environment config

Stop the app hardcoding which Supabase project it talks to. After this phase a
build must be **told** which backend it uses, and a build that is not told fails
at startup instead of silently defaulting to production.

This exists because of subscriptions: a sandbox purchase in a test build must not
be able to write a real entitlement, and the only reliable guarantee is that the
test build cannot reach the production database.

Prerequisite: Phase 1 is `Done`.

All paths below are relative to `C:\Users\maxes\RiftTrades\apps\mobile`.

## Steps

### 1. Create `env/production.json`

```json
{
  "APP_ENV": "production",
  "SUPABASE_URL": "https://tenrvaghaspwdvnwvgrh.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr"
}
```

### 2. Create `env/staging.json`

The staging publishable key is **not** in `CONVENTIONS.md`. Ask for it. Do not
put a placeholder in and do not reuse the production key — that would defeat the
entire point of this phase.

```json
{
  "APP_ENV": "staging",
  "SUPABASE_URL": "https://cnmxaccamqshgvesieez.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY": "<ask for this>"
}
```

### 3. Create `env/README.md`

Explain: each file is a set of `--dart-define` values for one environment; how to
pass it; that the app throws at startup without one, deliberately; and that these
files are safe to commit because publishable keys are public by design — every
catalog table is read-only under RLS and per-user data is scoped to `auth.uid()`.
Say plainly that real secrets (RevenueCat API keys, signing keys, service-role
keys) are passed separately by CI and never live in this directory.

### 4. Rewrite `lib/core/config/supabase_config.dart`

Replace the whole file. The current version has the URL and key as hardcoded
literals; the point is that they now come from the build.

```dart
/// Which Supabase project this build talks to.
///
/// There is deliberately no default for the URL or the key. A build that was
/// never told which backend it uses must fail rather than guess, because
/// guessing means a sandbox purchase in a test build writing a real entitlement.
///
/// The publishable key is safe to ship: catalog tables are public read-only
/// under RLS, and per-user rows are scoped to `auth.uid()`.
class SupabaseConfig {
  const SupabaseConfig._();

  static const url = String.fromEnvironment('SUPABASE_URL');
  static const publishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// `production` or `staging`. Only used to label non-production builds.
  static const environment =
      String.fromEnvironment('APP_ENV', defaultValue: 'production');

  static bool get isProduction => environment == 'production';

  static void assertConfigured() {
    if (url.isNotEmpty && publishableKey.isNotEmpty) return;
    throw StateError(
      'This build has no Supabase configuration.\n'
      'Pass one at build time, for example:\n'
      '  flutter run --dart-define-from-file=env/production.json\n',
    );
  }
}
```

### 5. Call it from `lib/main.dart`

Edit the existing `main()`. Add exactly one line, immediately after
`WidgetsFlutterBinding.ensureInitialized();` and **before**
`await Supabase.initialize(...)`:

```dart
  SupabaseConfig.assertConfigured();
```

Change nothing else in `main.dart` in this phase.

### 6. Add the "Test build" row to Settings

In `lib/features/settings/settings_screen.dart`, add a row that appears only when
`!SupabaseConfig.isProduction`, showing the environment name. Match the styling of
the rows already in that file — read it first. Keep it visually quiet; it is a
diagnostic, not a feature.

### 7. Add `test/core/config/build_env_test.dart`

Base it on `e:\Downlaods\Downloads\fabtrades\apps\mobile\test\core\config\build_env_test.dart`,
but assert more than that source does. It must check:

- Both `env/production.json` and `env/staging.json` parse as JSON objects.
- Each has all three keys: `APP_ENV`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- In each, `SUPABASE_URL` starts with `https://` and the key is non-empty. Do
  **not** allow blank values — the source repo allowed blanks for a period when
  its staging project did not exist yet, and that loophole is not wanted here.
- `APP_ENV` matches the filename (`production.json` has `production`).
- **Staging is not production**: staging's `SUPABASE_URL` differs from
  production's, and so does its key. This is the check that catches a
  copy-paste that would let a test build write real data.

### 8. Add the pre-build guard to both release pipelines

In `.github/workflows/release-android-closed.yml` and in `codemagic.yaml`, before
the build step, fail the build if the env file does not name a real project:

```bash
grep -q '"SUPABASE_URL": *"http' env/${APP_ENVIRONMENT}.json
```

Add an `APP_ENVIRONMENT` variable defaulting to `production` in both, and pass
`--dart-define-from-file=env/${APP_ENVIRONMENT}.json` to the Flutter build
command in both.

### 9. Update every documented build command

Search for build commands and add the flag:

```powershell
Select-String -Path ..\..\README.md,..\..\context.md,..\..\docs\*.md,README.md -Pattern "flutter run|flutter build"
```

Every one becomes, for example:

```sh
flutter run --dart-define-from-file=env/production.json
```

Skip `docs/PORT_PLAN.md` and `docs/port/*` — they already show the flag.

## Verify

Working directory: `C:\Users\maxes\RiftTrades\apps\mobile`

**From this phase onward the env flag is mandatory.**

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count is **225 or more** (224 baseline, plus the new env test)
- [ ] The new test genuinely fails when it should. Temporarily change
      `env/staging.json`'s `SUPABASE_URL` to the production URL, re-run
      `flutter test --dart-define-from-file=env/production.json`, and confirm the
      staging-is-not-production test **fails**. Then put it back and confirm it
      passes again. A test that cannot fail is not protecting anything.
- [ ] No hardcoded project URL remains in Dart source:

```powershell
Select-String -Path lib -Include *.dart -Pattern "tenrvaghaspwdvnwvgrh|sb_publishable_"
```

  Must return nothing. If it returns `supabase_config.dart`, step 4 was not
  applied.

- [ ] A build with no env file fails cleanly. Run `flutter test` **without** the
      flag and confirm you get the `StateError` message from `assertConfigured`,
      not a crash or a silent pass.

## Commit

```powershell
git add -A
git commit -m "Make every build state which Supabase project it uses"
```

Set Phase 2 to `Done` in `docs/port/README.md`.
