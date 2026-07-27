# FAB Trades port — execution guide

This directory is the **execution** half of the port. It tells you exactly what to
do, in order, with exact commands.

The **reasoning** half is [`../PORT_PLAN.md`](../PORT_PLAN.md) — the decisions,
the alternatives that were rejected, and why. You do not need to read it to
execute. Read it only if a step here seems wrong, or if you are about to deviate.

## How to work

1. Read [`CONVENTIONS.md`](CONVENTIONS.md) **once, fully**, before your first
   phase. It holds every constant, rename rule, and trap. Do not invent values
   that are not in it.
2. Open the **one** phase file for the phase you are on. Do not read ahead to
   later phases — their file paths assume earlier phases already landed, and
   acting on them early will break things.
3. Do the numbered steps in order. Do not reorder or batch them.
4. Run the phase's **Verify** section. Every check must pass.
5. Commit with the message given in the phase file.
6. Update the progress table below in the same commit.
7. Move to the next phase.

## Ground rules

These apply to every phase. Violating any one of them has broken something in
this repo before.

- **This is PowerShell on Windows.** `&&` is not a valid separator. Use `;`.
- **Never `cd` inside a command.** Set the working directory instead.
- **Copy files from the FAB Trades repo. Do not write them from memory.** The
  source repo is at `e:\Downlaods\Downloads\fabtrades`. Every file you add has an
  exact source path in its phase file. Read the source, then write the target.
- **Never rename a SharedPreferences key.** Doing so orphans every existing
  user's data. The four keys are listed in `CONVENTIONS.md` under "Never change".
- **Never edit a migration that has already been applied.** Add a new one.
- **Never run `npx supabase db pull`, `db diff`, or `db reset` against the shared
  project.** It will pull FAB Trades' tables and a later push may try to drop
  them. `CONVENTIONS.md` explains what to run instead.
- **The `supabase` CLI is not installed.** Use `npx supabase` everywhere.
- **After Phase 2, every `flutter run`, `flutter build`, and `flutter test`
  needs `--dart-define-from-file=env/production.json`.** Builds fail without it,
  by design. Phase 2 tells you when this starts applying.

## When to stop and ask

Stop and report rather than improvising if any of these happen:

- A **Verify** check fails twice in a row after your fix attempts.
- A step tells you to edit a file and the text you are told to replace is not
  there, or appears more than once.
- You need a value that is not in `CONVENTIONS.md` (an API key, a product id, a
  project ref, a secret).
- A step requires something only a human can do — a store console, a dashboard,
  a paid signup, an Apple certificate.
- `flutter test` count **drops**. It should only ever go up. The baseline is 224
  unit tests plus 4 integration tests.
- You are about to change a file under `e:\Downlaods\Downloads\fabtrades`. That
  repo is **read-only** for this work. Never write to it.

Report what you observed, which step you were on, and what you think the cause
is. Do not skip the step and continue.

## Phases

Phases 0 through 4 are strictly sequential — each depends on the one before.
Phase 5 depends on 3 and 4. Phases 6, 7, and 8 can be done in any order once 5
is done.

| Phase | File | What it does | Status |
| --- | --- | --- | --- |
| 0 | [PHASE-0.md](PHASE-0.md) | Repo restructure to `apps/mobile` + `services/price-pipeline` | Done |
| 1 | [PHASE-1.md](PHASE-1.md) | Put the existing schema under version control | Done |
| 2 | [PHASE-2.md](PHASE-2.md) | Build-time environment config | Done |
| 3 | [PHASE-3.md](PHASE-3.md) | Supabase Auth (Apple, Google, Discord) | Blocked — code landed, see below |
| 4 | [PHASE-4.md](PHASE-4.md) | Cloud sync | Done — manual sync check outstanding, see below |
| 5 | [PHASE-5.md](PHASE-5.md) | Pro subscriptions and entitlements | Done — store verification outstanding, see below |
| 6 | [PHASE-6.md](PHASE-6.md) | CI | Done |
| 7 | [PHASE-7.md](PHASE-7.md) | One release tag for both stores | Done |
| 8 | [PHASE-8.md](PHASE-8.md) | Remaining UI parity and docs | In progress |

Set Status to `In progress` when you start a phase and `Done` when its Verify
section passes and you have committed.

## Human tasks that block phases

These cannot be done from the repo. If a phase's Verify section needs one of
these and it is not done, stop and report — do not work around it.

| Needed before | Task |
| --- | --- |
| Phase 3 Verify | Enable Apple, Google, Discord in Supabase; add `rifttrades://login-callback` to the redirect allow-list on **both** projects |
| Phase 3 step 6 | In Xcode, add the Sign in with Apple capability so `CODE_SIGN_ENTITLEMENTS` is set and `ios/Runner/Runner.entitlements` exists. Step 6 stopped rather than hand-editing `project.pbxproj`, so Apple sign-in cannot work on iOS until this is done. Google and Discord are unaffected. |
| Phase 4 Verify | Walk PHASE-4.md's manual check on two devices, or across a reinstall. Its automated checks pass, but no test can prove the merge behaves against a real account. Step 4 is the one that matters: if the first account's cards show up in the second account's binder, stop — that is live data corruption. |
| Phase 5 Verify | Create the RevenueCat project, products, and `RiftTrades Pro` entitlement, then set the function secrets `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY`, and `RECONCILE_SECRET` on both Supabase projects. Also add the RevenueCat publishable SDK keys to `apps/mobile/env/*.json` — they are deliberately absent, and while absent `isConfigured` is false and subscriptions stay off. Debug builds use the Test Store, so store misconfiguration only surfaces in a release build. |
| Phase 7 Verify | Confirm the Codemagic webhook fires on tag push |
