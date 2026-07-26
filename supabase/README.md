# Supabase

Database schema for RiftTrades.

## This project is shared

The Supabase project `tenrvaghaspwdvnwvgrh` backs two products:

- **RiftTrades** owns the unprefixed catalog tables (`sets`, `cards`,
  `card_prices`, `price_history`, `pipeline_runs`, `app_config`, and the
  `cards_with_prices` view) and the `rift_`-prefixed user-data tables. Those are
  the migrations in this directory.
- **FAB Trades** owns the `fab_*` catalog tables and the unprefixed user-data
  tables (`trades`, `binder_entries`, `lend_groups`, `user_settings`,
  `entitlements`, `billing_events`). Its migrations live in that product's
  repository.

So the version numbers here have gaps, and that is deliberate — the missing
versions belong to FAB Trades. Two consequences worth knowing:

- `supabase db push` from this repo only ever touches RiftTrades objects.
- A clean local stack from this repo alone has the Riftbound catalog and, once
  later phases land them, the `rift_*` user-data tables. It will not have FAB's
  tables.

Before adding a user-data table, prefix it `rift_`. New catalog objects stay
unprefixed only when they are genuinely part of the shared Riftbound catalog
surface this app already owns.

## Layout

```
migrations/    Schema changes, applied in filename order
config.toml    Local stack + CLI configuration
```

Edge Functions will live under `functions/` once Phase 5 adds them. Until then
this directory holds schema only.

Migration filenames must match the versions in `supabase_migrations.schema_migrations`
on the remote. Applying a migration through the dashboard or MCP records *its own*
timestamp, so if you do that, rename the local file to match — otherwise
`supabase db push` sees an unapplied migration and tries to run it again.

## Working on the schema

The CLI is not committed as a dependency; use `npx supabase` (or install it per the
[Supabase docs](https://supabase.com/docs/guides/local-development)).

```bash
npx supabase link --project-ref tenrvaghaspwdvnwvgrh
npx supabase db push                           # apply pending migrations to the linked project
npx supabase migration list                    # compare local and remote history
```

**Never** run `db pull`, `db diff`, or `db reset` against the shared project
`tenrvaghaspwdvnwvgrh`. Those commands will pull in or try to drop FAB Trades'
tables. Write migrations by hand.

Never edit an already-applied migration. The remote records a checksum per
version, so amending one makes local and remote disagree in a way that is
tedious to unpick. Add a new migration instead.

## Authentication

Three providers, enabled for both clients: Apple, Google, and Discord.
`config.toml` declares them, but a linked project reads its provider settings
from the dashboard rather than from this file, so changes there must be made in
both places.

The one setting that silently breaks mobile sign-in if missed:
`rifttrades://login-callback` must appear in **Authentication → URL Configuration →
Redirect URLs**. Without it Google and Discord sign-in completes in the browser and
never returns to the app.

## Row Level Security

Every table has RLS enabled. The rules for objects this repo owns are:

- **Catalog** (`sets`, `cards`, `card_prices`, `price_history`, `app_config`) —
  public `select` for `anon` and `authenticated`. Prices are public information
  and the client reads them without signing in.
- **`pipeline_runs`** — RLS enabled with no policy at all, so only the service
  role can see them. Ingest logs are operational data.
- **User data** (`rift_*` tables, once added) — `select`/`insert`/`update`/`delete`
  restricted to `auth.uid() = user_id`.
- **`rift_entitlements`** (once added) — `select` only, restricted to
  `auth.uid() = user_id`. Read-only to clients by design; Edge Functions write it
  with the service role.

The price pipeline writes with the service role, which bypasses RLS. That is why
no catalog table needs an insert or update policy.
