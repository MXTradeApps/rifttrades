-- Per-account sync tables for RiftTrades.
--
-- `updated_at` is supplied by the client, not defaulted server-side: the merge is
-- last-write-wins across devices, so the timestamp has to mean "when the user
-- made this change", not "when the row reached Postgres".
--
-- Deletes are tombstones (`deleted_at`), never row removals. A client that pulls
-- a full list cannot otherwise tell a record deleted elsewhere from one it has
-- never seen, and would resurrect it.
--
-- These are `rift_`-prefixed because the unprefixed equivalents in this project
-- belong to FAB Trades and hold its users' data.

create table if not exists public.rift_binder_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users on delete cascade,
  card_id    text        not null,
  is_wanted  boolean     not null default false,
  quantity   integer     not null default 1 check (quantity > 0),
  condition  text        not null default 'NM',
  card       jsonb       not null,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, card_id, is_wanted)
);

create table if not exists public.rift_lend_groups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users on delete cascade,
  client_id    text        not null,
  person_name  text,
  is_borrowing boolean     not null default false,
  items        jsonb       not null default '[]',
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  deleted_at   timestamptz,
  unique (user_id, client_id)
);

create table if not exists public.rift_trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users on delete cascade,
  client_id       text        not null,
  name            text,
  have_list       jsonb       not null,
  want_list       jsonb       not null,
  have_total      numeric(10,2),
  want_total      numeric(10,2),
  diff            numeric(10,2),
  have_cash       numeric(10,2) not null default 0,
  want_cash       numeric(10,2) not null default 0,
  currency_symbol text        not null default '$',
  notes           text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (user_id, client_id)
);

-- One row per user. Reset is an update, so there is no delete policy below.
create table if not exists public.rift_user_settings (
  user_id      uuid primary key references auth.users on delete cascade,
  price_source text        not null default 'tcgplayer' check (price_source in ('tcgplayer','cardmarket')),
  theme_mode   text        not null default 'dark'      check (theme_mode  in ('light','dark')),
  updated_at   timestamptz not null default now()
);

create index if not exists rift_binder_entries_user_id_updated_at_idx
  on public.rift_binder_entries (user_id, updated_at desc);
create index if not exists rift_lend_groups_user_id_updated_at_idx
  on public.rift_lend_groups (user_id, updated_at desc);
create index if not exists rift_trades_user_id_updated_at_idx
  on public.rift_trades (user_id, updated_at desc);

alter table public.rift_binder_entries enable row level security;
alter table public.rift_lend_groups     enable row level security;
alter table public.rift_trades          enable row level security;
alter table public.rift_user_settings   enable row level security;

create policy "Users can view own rift_binder_entries"
  on public.rift_binder_entries for select using (auth.uid() = user_id);
create policy "Users can insert own rift_binder_entries"
  on public.rift_binder_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own rift_binder_entries"
  on public.rift_binder_entries for update using (auth.uid() = user_id)
                                          with check (auth.uid() = user_id);
create policy "Users can delete own rift_binder_entries"
  on public.rift_binder_entries for delete using (auth.uid() = user_id);

create policy "Users can view own rift_lend_groups"
  on public.rift_lend_groups for select using (auth.uid() = user_id);
create policy "Users can insert own rift_lend_groups"
  on public.rift_lend_groups for insert with check (auth.uid() = user_id);
create policy "Users can update own rift_lend_groups"
  on public.rift_lend_groups for update using (auth.uid() = user_id)
                                          with check (auth.uid() = user_id);
create policy "Users can delete own rift_lend_groups"
  on public.rift_lend_groups for delete using (auth.uid() = user_id);

create policy "Users can view own rift_trades"
  on public.rift_trades for select using (auth.uid() = user_id);
create policy "Users can insert own rift_trades"
  on public.rift_trades for insert with check (auth.uid() = user_id);
create policy "Users can update own rift_trades"
  on public.rift_trades for update using (auth.uid() = user_id)
                                          with check (auth.uid() = user_id);
create policy "Users can delete own rift_trades"
  on public.rift_trades for delete using (auth.uid() = user_id);

create policy "Users can view own rift_user_settings"
  on public.rift_user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own rift_user_settings"
  on public.rift_user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own rift_user_settings"
  on public.rift_user_settings for update using (auth.uid() = user_id)
                                          with check (auth.uid() = user_id);
