-- Server-owned record of who has RiftTrades Pro.
--
-- Written only by the service role, from the Edge Functions. A client that could
-- write `is_active` could grant itself Pro, so clients get select on their own
-- row and nothing else.
--
-- These are `rift_`-prefixed because the unprefixed equivalents in this project
-- belong to FAB Trades and hold its paying customers' billing state.

create table if not exists public.rift_entitlements (
  user_id         uuid primary key references auth.users on delete cascade,
  tier            text        not null default 'free' check (tier in ('free','pro')),
  is_active       boolean     not null default false,
  is_trialing     boolean     not null default false,
  in_grace_period boolean     not null default false,
  source          text        check (source in ('app_store','play_store','stripe','promo')),
  product_id      text,
  expires_at      timestamptz,
  is_sandbox      boolean     not null default false,
  rc_customer_id  text,
  updated_at      timestamptz not null default now()
);

alter table public.rift_entitlements enable row level security;

create policy "Users can view own rift_entitlement"
  on public.rift_entitlements for select using (auth.uid() = user_id);

-- Index for the nightly sweep, which scans an expires_at range and deliberately
-- does not filter on is_active — rows deactivated in error must remain visible
-- to be repaired.
create index if not exists rift_entitlements_expires_at_idx
  on public.rift_entitlements (expires_at);

-- Idempotency ledger and dispute audit trail. No client ever reads this, so it
-- gets RLS with no policy at all: service role only.
--
-- `app_user_id` deliberately has no foreign key — events arrive for anonymous
-- and deleted users and must still be recorded.
create table if not exists public.rift_billing_events (
  id          text primary key,
  provider    text        not null default 'revenuecat',
  app_user_id uuid,
  payload     jsonb       not null,
  received_at timestamptz not null default now()
);

alter table public.rift_billing_events enable row level security;

create index if not exists rift_billing_events_app_user_id_received_at_idx
  on public.rift_billing_events (app_user_id, received_at desc);
