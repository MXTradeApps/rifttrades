# Supabase

Database schema for RiftTrades.

## Projects

| Role | Project | Ref |
| --- | --- | --- |
| Production | **fabloodle** | `cnmxaccamqshgvesieez` |
| Staging (intended) | **fabtools** (paused) | `akpgocviouxipfckqomv` |
| Staging (interim) | former `RiftTrades` project | `tenrvaghaspwdvnwvgrh` |

Production lives on **fabloodle**. That project still has leftover `fab_*` /
game tables from earlier use; RiftTrades owns the unprefixed catalog and the
`rift_*` user-data tables. Keep the `rift_` prefix on new user-data tables so
they never collide with those leftovers.

The former `RiftTrades` project (`tenrvaghaspwdvnwvgrh`) is left for **FAB Trades**
auth and data. RiftTrades production no longer points at it.

### Why staging is interim

The org is on the free plan (two active projects). Restoring paused **fabtools**
fails while fabloodle and the FAB Trades project are both active. Until a free
slot opens or the org upgrades, staging builds use `tenrvaghaspwdvnwvgrh` so
sandbox traffic stays off fabloodle production. When fabtools can be restored,
apply the migrations there, deploy Edge Functions, and retarget
`apps/mobile/env/staging.json`.

## Layout

```
migrations/    Schema changes, applied in filename order
config.toml    Local stack + CLI configuration
functions/     Edge Functions (RevenueCat webhook + reconcile)
```

Migration filenames must match the versions you insert into
`supabase_migrations.schema_migrations` on the remote. When you apply SQL by
hand, record the local file's version and name — do not let the dashboard mint a
different timestamp.

## Working on the schema

The CLI is not committed as a dependency; use `npx supabase` (or install it per the
[Supabase docs](https://supabase.com/docs/guides/local-development)).

```bash
npx supabase link --project-ref cnmxaccamqshgvesieez
npx supabase migration list
```

fabloodle may still carry migration history from its previous tenants. If
`db push` refuses because of foreign versions, apply SQL by hand then:

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('<version>', '<name>');
```

Never edit an already-applied migration. The remote records a checksum per
version, so amending one makes local and remote disagree in a way that is
tedious to unpick. Add a new migration instead.

## Authentication

Three providers: Apple, Google, and Discord. `config.toml` declares them, but a
linked project reads provider settings from the dashboard, so changes there must
be made in both places.

`rifttrades://login-callback` must appear in **Authentication → URL Configuration →
Redirect URLs** on fabloodle (and on staging). Without it Google and Discord
sign-in completes in the browser and never returns to the app.

## Row Level Security

Every table has RLS enabled. The rules for objects this repo owns are:

- **Catalog** (`sets`, `cards`, `card_prices`, `price_history`, `app_config`) —
  public `select` for `anon` and `authenticated`. Prices are public information
  and the client reads them without signing in.
- **`pipeline_runs`** — RLS enabled with no policy at all, so only the service
  role can see them. Ingest logs are operational data.
- **User data** (`rift_*` tables) — `select`/`insert`/`update`/`delete`
  restricted to `auth.uid() = user_id`.
- **`rift_entitlements`** — `select` only, restricted to
  `auth.uid() = user_id`. Read-only to clients by design; Edge Functions write it
  with the service role.

The price pipeline writes with the service role, which bypasses RLS. That is why
no catalog table needs an insert or update policy.
