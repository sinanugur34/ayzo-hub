begin;

-- ============================================================
-- AYZO PRO PLATFORM FOUNDATION
--
-- Billing state:
--   billing_customers
--   subscriptions
--   webhook_events
--
-- Retention / user-owned intelligence:
--   saved_analyses
--   watchlists
--   watchlist_items
--   alert_rules
--
-- IMPORTANT:
-- Browser users may read their own billing state,
-- but may never create/update/delete billing state.
-- Billing writes are server-only via AYZO admin client.
-- ============================================================


-- ------------------------------------------------------------
-- 0. SAFETY: THIS IS A FIRST-CREATION MIGRATION
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.billing_customers') is not null
     or to_regclass('public.subscriptions') is not null
     or to_regclass('public.webhook_events') is not null
     or to_regclass('public.saved_analyses') is not null
     or to_regclass('public.watchlists') is not null
     or to_regclass('public.watchlist_items') is not null
     or to_regclass('public.alert_rules') is not null
  then
    raise exception
      'AYZO platform foundation tables already exist. Migration aborted.';
  end if;
end
$$;


-- ------------------------------------------------------------
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------

create function public.ayzo_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- BILLING
-- ============================================================

-- ------------------------------------------------------------
-- 2. BILLING CUSTOMERS
-- ------------------------------------------------------------

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  provider text not null
    check (char_length(trim(provider)) > 0),

  provider_customer_id text not null
    check (char_length(trim(provider_customer_id)) > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, provider),
  unique (provider, provider_customer_id)
);

create index billing_customers_user_id_idx
  on public.billing_customers(user_id);


-- ------------------------------------------------------------
-- 3. SUBSCRIPTIONS
-- ------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  provider text not null
    check (char_length(trim(provider)) > 0),

  provider_subscription_id text,

  plan_id text not null
    check (plan_id in ('pro', 'advanced')),

  billing_interval text not null
    check (billing_interval in ('monthly', 'annual')),

  status text not null
    check (
      status in (
        'pending',
        'active',
        'canceling',
        'past_due',
        'inactive'
      )
    ),

  locked_price_usd_cents integer not null
    check (locked_price_usd_cents >= 0),

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,
  founding_customer boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    current_period_end is null
    or current_period_start is null
    or current_period_end > current_period_start
  )
);

create index subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index subscriptions_user_status_idx
  on public.subscriptions(user_id, status);

create unique index subscriptions_provider_subscription_uidx
  on public.subscriptions(
    provider,
    provider_subscription_id
  )
  where provider_subscription_id is not null;


-- ------------------------------------------------------------
-- 4. WEBHOOK EVENTS
-- ------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),

  provider text not null
    check (char_length(trim(provider)) > 0),

  provider_event_id text not null
    check (char_length(trim(provider_event_id)) > 0),

  event_type text not null
    check (char_length(trim(event_type)) > 0),

  processing_status text not null
    default 'received'
    check (
      processing_status in (
        'received',
        'processing',
        'processed',
        'failed',
        'ignored'
      )
    ),

  payload_hash text,

  received_at timestamptz not null default now(),
  processed_at timestamptz,

  unique (provider, provider_event_id)
);

create index webhook_events_status_idx
  on public.webhook_events(processing_status);

create index webhook_events_received_at_idx
  on public.webhook_events(received_at desc);


-- ============================================================
-- USER-OWNED INTELLIGENCE / RETENTION
-- ============================================================

-- ------------------------------------------------------------
-- 5. SAVED ANALYSES
-- ------------------------------------------------------------

create table public.saved_analyses (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  network text not null
    check (char_length(trim(network)) > 0),

  subject_type text not null
    check (
      subject_type in (
        'wallet',
        'token',
        'transaction',
        'entity',
        'protocol'
      )
    ),

  subject_value text not null
    check (char_length(trim(subject_value)) > 0),

  title text,
  notes text,

  source_analysis_id text,

  analysis_payload jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_analyses_user_created_idx
  on public.saved_analyses(
    user_id,
    created_at desc
  );

create index saved_analyses_subject_idx
  on public.saved_analyses(
    user_id,
    network,
    subject_type,
    subject_value
  );


-- ------------------------------------------------------------
-- 6. WATCHLISTS
-- ------------------------------------------------------------

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name)) between 1 and 120
    ),

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index watchlists_user_created_idx
  on public.watchlists(
    user_id,
    created_at desc
  );


-- ------------------------------------------------------------
-- 7. WATCHLIST ITEMS
-- ------------------------------------------------------------

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),

  watchlist_id uuid not null
    references public.watchlists(id)
    on delete cascade,

  network text not null
    check (char_length(trim(network)) > 0),

  subject_type text not null
    check (
      subject_type in (
        'wallet',
        'token',
        'transaction',
        'entity',
        'protocol'
      )
    ),

  subject_value text not null
    check (char_length(trim(subject_value)) > 0),

  label text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    watchlist_id,
    network,
    subject_type,
    subject_value
  )
);

create index watchlist_items_watchlist_idx
  on public.watchlist_items(
    watchlist_id,
    created_at desc
  );


-- ------------------------------------------------------------
-- 8. ALERT RULES
-- ------------------------------------------------------------

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  watchlist_id uuid
    references public.watchlists(id)
    on delete cascade,

  network text,

  subject_type text
    check (
      subject_type is null
      or subject_type in (
        'wallet',
        'token',
        'transaction',
        'entity',
        'protocol'
      )
    ),

  subject_value text,

  rule_type text not null
    check (char_length(trim(rule_type)) > 0),

  rule_config jsonb not null default '{}'::jsonb,

  delivery_channel text not null default 'email'
    check (
      delivery_channel in (
        'email',
        'browser',
        'telegram'
      )
    ),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (
      subject_type is null
      and subject_value is null
    )
    or
    (
      subject_type is not null
      and subject_value is not null
      and char_length(trim(subject_value)) > 0
    )
  )
);

create index alert_rules_user_enabled_idx
  on public.alert_rules(
    user_id,
    enabled
  );

create index alert_rules_watchlist_idx
  on public.alert_rules(watchlist_id)
  where watchlist_id is not null;


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row
execute function public.ayzo_set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.ayzo_set_updated_at();

create trigger saved_analyses_set_updated_at
before update on public.saved_analyses
for each row
execute function public.ayzo_set_updated_at();

create trigger watchlists_set_updated_at
before update on public.watchlists
for each row
execute function public.ayzo_set_updated_at();

create trigger watchlist_items_set_updated_at
before update on public.watchlist_items
for each row
execute function public.ayzo_set_updated_at();

create trigger alert_rules_set_updated_at
before update on public.alert_rules
for each row
execute function public.ayzo_set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.billing_customers
  enable row level security;

alter table public.subscriptions
  enable row level security;

alter table public.webhook_events
  enable row level security;

alter table public.saved_analyses
  enable row level security;

alter table public.watchlists
  enable row level security;

alter table public.watchlist_items
  enable row level security;

alter table public.alert_rules
  enable row level security;


-- ------------------------------------------------------------
-- BILLING RLS
--
-- Authenticated users:
--   SELECT their own billing records
--
-- Authenticated users may NOT:
--   INSERT
--   UPDATE
--   DELETE
--
-- Server admin client performs billing writes.
-- ------------------------------------------------------------

create policy billing_customers_select_own
on public.billing_customers
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
);

-- webhook_events intentionally receives NO browser policy.


-- ------------------------------------------------------------
-- SAVED ANALYSES RLS
-- ------------------------------------------------------------

create policy saved_analyses_select_own
on public.saved_analyses
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy saved_analyses_insert_own
on public.saved_analyses
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy saved_analyses_update_own
on public.saved_analyses
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

create policy saved_analyses_delete_own
on public.saved_analyses
for delete
to authenticated
using (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- WATCHLISTS RLS
-- ------------------------------------------------------------

create policy watchlists_select_own
on public.watchlists
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy watchlists_insert_own
on public.watchlists
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy watchlists_update_own
on public.watchlists
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

create policy watchlists_delete_own
on public.watchlists
for delete
to authenticated
using (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- WATCHLIST ITEMS RLS
--
-- Ownership is inherited from the parent watchlist.
-- ------------------------------------------------------------

create policy watchlist_items_select_own
on public.watchlist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_id
      and w.user_id = auth.uid()
  )
);

create policy watchlist_items_insert_own
on public.watchlist_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_id
      and w.user_id = auth.uid()
  )
);

create policy watchlist_items_update_own
on public.watchlist_items
for update
to authenticated
using (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_id
      and w.user_id = auth.uid()
  )
);

create policy watchlist_items_delete_own
on public.watchlist_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_id
      and w.user_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- ALERT RULES RLS
--
-- A rule belongs to auth.uid().
-- If attached to a watchlist, that watchlist must
-- also belong to auth.uid().
-- ------------------------------------------------------------

create policy alert_rules_select_own
on public.alert_rules
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy alert_rules_insert_own
on public.alert_rules
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    watchlist_id is null
    or exists (
      select 1
      from public.watchlists w
      where w.id = watchlist_id
        and w.user_id = auth.uid()
    )
  )
);

create policy alert_rules_update_own
on public.alert_rules
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and (
    watchlist_id is null
    or exists (
      select 1
      from public.watchlists w
      where w.id = watchlist_id
        and w.user_id = auth.uid()
    )
  )
);

create policy alert_rules_delete_own
on public.alert_rules
for delete
to authenticated
using (
  user_id = auth.uid()
);


-- ============================================================
-- PRIVILEGES
-- ============================================================

-- Anonymous users receive no platform table access.

revoke all
on table
  public.billing_customers,
  public.subscriptions,
  public.webhook_events,
  public.saved_analyses,
  public.watchlists,
  public.watchlist_items,
  public.alert_rules
from anon;


-- Authenticated users can only SELECT billing state.

revoke all
on table
  public.billing_customers,
  public.subscriptions,
  public.webhook_events
from authenticated;

grant select
on table
  public.billing_customers,
  public.subscriptions
to authenticated;


-- Authenticated users may CRUD their own retention data.
-- RLS remains the authoritative ownership boundary.

revoke all
on table
  public.saved_analyses,
  public.watchlists,
  public.watchlist_items,
  public.alert_rules
from authenticated;

grant
  select,
  insert,
  update,
  delete
on table
  public.saved_analyses,
  public.watchlists,
  public.watchlist_items,
  public.alert_rules
to authenticated;


-- ============================================================
-- COMMENT CONTRACT
-- ============================================================

comment on table public.billing_customers is
  'Server-managed billing customer mapping. Browser clients have read-only access to their own record.';

comment on table public.subscriptions is
  'Server-managed AYZO subscription state. Provider webhooks are authoritative.';

comment on table public.webhook_events is
  'Server-only webhook idempotency and processing ledger. Raw payment payloads are intentionally not required.';

comment on table public.saved_analyses is
  'Authenticated user-owned saved AYZO analyses.';

comment on table public.watchlists is
  'Authenticated user-owned AYZO monitoring watchlists.';

comment on table public.watchlist_items is
  'Wallet/token/entity/protocol items belonging to an AYZO watchlist.';

comment on table public.alert_rules is
  'Authenticated user-owned monitoring rule definitions. Delivery implementation may arrive later.';


commit;
