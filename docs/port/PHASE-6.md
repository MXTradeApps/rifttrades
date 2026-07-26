# Phase 6 — CI

There is no CI for the app today, only a price-ingest cron and a manual Android
release. Add a workflow that analyses and tests on every push and pull request.

Prerequisite: Phase 5 is `Done`. (Phases 6, 7, and 8 can be done in any order.)

## Steps

### 1. Create `.github/workflows/ci.yml`

Model it on `e:\Downlaods\Downloads\fabtrades\.github\workflows\ci.yml`. Triggers:
push to `main`, and all pull requests. Add a concurrency group keyed on the ref
that cancels in-progress runs, so a second push does not queue behind the first.

### 2. Add the path filter

Use `dorny/paths-filter@v3` in a `changes` job so unrelated pushes do not run
everything. Note the paths differ from the source repo — there is no `apps/web`
and no `packages/contracts`.

| Output | Paths |
| --- | --- |
| `mobile` | `apps/mobile/**`, `scripts/**`, `.github/workflows/ci.yml` |
| `supabase` | `supabase/**`, `.github/workflows/ci.yml` |
| `functions` | `supabase/functions/**`, `.github/workflows/ci.yml` |
| `pipeline` | `services/price-pipeline/**`, `.github/workflows/ci.yml` |

### 3. Add the jobs

**`mobile`** — runs if `mobile` changed. Flutter stable, then:

```yaml
      - run: flutter pub get
        working-directory: apps/mobile
      - run: flutter analyze
        working-directory: apps/mobile
      - run: flutter test --dart-define-from-file=env/production.json
        working-directory: apps/mobile
```

The `--dart-define-from-file` flag is required from Phase 2 onward. Without it the
job fails on `assertConfigured`.

Do **not** add `dart format --set-exit-if-changed`. Formatting is not gated in
either repo, and turning it on now would fail on files this port has not touched.

**`supabase`** — runs if `supabase` changed. `npx supabase db start` to prove the
migrations apply to an empty database, then `npx supabase db lint --level warning`.

This job is why no RiftTrades migration may reference a `fab_*` object: the local
stack only has this repo's migrations.

**`functions`** — runs if `functions` changed. Deno, then from
`supabase/functions`: `deno fmt --check`, `deno lint`, `deno check "**/*.ts"`,
`deno test`.

**`pipeline`** — runs if `pipeline` changed. Node 22, `npm ci` in
`services/price-pipeline`, and whatever test script exists there. Read its
`package.json` first; if it has no test script, skip this job rather than
inventing one.

## Verify

Local equivalents of each job must pass before you push. From `apps/mobile`:

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

From `supabase/functions`:

```powershell
deno fmt --check
deno lint
deno check "**/*.ts"
deno test
```

Checks:

- [ ] The workflow file is valid YAML:

```powershell
gh workflow list
```

- [ ] Every `working-directory` points at `apps/mobile`, `supabase`,
      `supabase/functions`, or `services/price-pipeline` — never bare `app` or
      `pipeline`
- [ ] Every `flutter test` in the file carries `--dart-define-from-file`

Then push a branch and confirm the run goes green:

```powershell
gh run list --limit 5
```

If a job fails in CI but passed locally, read the log before changing anything:

```powershell
gh run view --log-failed
```

## Commit

```powershell
git add .github/workflows/ci.yml
git commit -m "Run analyze, tests, and schema checks on every push"
```

Set Phase 6 to `Done` in `docs/port/README.md`.
