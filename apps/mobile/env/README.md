# Build environments

Each file here is a set of `--dart-define` values for one environment:

```sh
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/staging.json
```

Without one of these the app throws at startup. That is deliberate — see the note
in [supabase_config.dart](../lib/core/config/supabase_config.dart).

`production.json` points at **fabloodle** (`cnmxaccamqshgvesieez`).
`staging.json` currently points at the former RiftTrades project
(`tenrvaghaspwdvnwvgrh`) so sandbox purchases stay off production. Intended
staging is paused **fabtools** — see [ENVIRONMENTS.md](../../../docs/ENVIRONMENTS.md).

These are safe to commit. Publishable keys are public by design: every catalog
table is read-only under RLS and per-user data is scoped to `auth.uid()`. Real
secrets — RevenueCat API keys, signing keys, service-role keys — are passed
separately by CI and never live in this directory.
