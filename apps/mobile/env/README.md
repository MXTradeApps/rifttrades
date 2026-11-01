# Build environments

Each file here is a set of `--dart-define` values for one environment:

```sh
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/staging.json
```

Without one of these the app throws at startup. That is deliberate — see the note
in [supabase_config.dart](../lib/core/config/supabase_config.dart).

Xcode Run is the exception: `ios/Flutter/xcode_backend_with_defines.sh` applies
`production.json` when the build has no `SUPABASE_URL` yet, so opening
`ios/Runner.xcworkspace` and hitting Run works. A CLI/CI build that already
passed `--dart-define-from-file` (including staging) is left alone. To point
an Xcode Run at staging, set `APP_ENVIRONMENT=staging` on the scheme.

`production.json` points at **fabloodle** (`cnmxaccamqshgvesieez`).
`staging.json` currently points at the former RiftTrades project
(`tenrvaghaspwdvnwvgrh`) so sandbox purchases stay off production. Intended
staging is paused **fabtools** — see [ENVIRONMENTS.md](../../../docs/ENVIRONMENTS.md).

These are safe to commit. Publishable keys are public by design: every catalog
table is read-only under RLS and per-user data is scoped to `auth.uid()`. Real
secrets — RevenueCat API keys, signing keys, service-role keys — are passed
separately by CI and never live in this directory.

Push notifications for price alerts read optional `FIREBASE_*` values from the same
files; without them push is simply off. See
[docs/PRICE_ALERTS.md](../../../docs/PRICE_ALERTS.md).
