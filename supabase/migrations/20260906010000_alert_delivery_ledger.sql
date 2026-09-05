-- AYZO Alert Delivery Ledger v1
--
-- Foundation only.
-- This migration does NOT send notifications.
--
-- Architecture:
-- alert_events
--   -> trigger
--   -> alert_deliveries (pending)
--   -> server-only atomic claim
--   -> later provider adapter
--
-- Browser mutation access is intentionally closed.


-- ------------------------------------------------------------
-- 1. COMPOSITE EVENT OWNER KEY
-- ------------------------------------------------------------

alter table
  public.alert_events
add constraint
  alert_events_id_user_unique
unique (
  id,
  user_id
);


-- ------------------------------------------------------------
-- 2. ALERT DELIVERY LEDGER
-- ------------------------------------------------------------

create table
  public.alert_deliveries (
    id uuid primary key
      default gen_random_uuid(),

    alert_event_id uuid not null,

    alert_rule_id uuid not null,

    user_id uuid not null,

    delivery_channel text not null
      check (
        delivery_channel in (
          'email',
          'browser',
          'telegram'
        )
      ),

    status text not null
      default 'pending'
      check (
        status in (
          'pending',
          'processing',
          'delivered',
          'failed'
        )
      ),

    attempt_count integer not null
      default 0
      check (
        attempt_count >= 0
        and attempt_count <= 10
      ),

    max_attempts integer not null
      default 3
      check (
        max_attempts >= 1
        and max_attempts <= 10
      ),

    next_attempt_at timestamptz
      default now(),

    claim_token uuid,

    claimed_at timestamptz,

    last_error_code text,

    last_error_at timestamptz,

    provider_message_id text,

    delivered_at timestamptz,

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint
      alert_deliveries_event_owner_fk
    foreign key (
      alert_event_id,
      user_id
    )
    references
      public.alert_events(
        id,
        user_id
      )
    on delete cascade,

    constraint
      alert_deliveries_rule_owner_fk
    foreign key (
      alert_rule_id,
      user_id
    )
    references
      public.alert_rules(
        id,
        user_id
      )
    on delete cascade,

    constraint
      alert_deliveries_attempt_budget_check
    check (
      attempt_count <= max_attempts
    ),

    constraint
      alert_deliveries_claim_state_check
    check (
      (
        status = 'processing'
        and claim_token is not null
        and claimed_at is not null
      )
      or
      (
        status <> 'processing'
        and claim_token is null
        and claimed_at is null
      )
    ),

    constraint
      alert_deliveries_delivered_state_check
    check (
      (
        status = 'delivered'
        and delivered_at is not null
      )
      or
      (
        status <> 'delivered'
        and delivered_at is null
      )
    ),

    unique (
      alert_event_id,
      delivery_channel
    )
  );


create index
  alert_deliveries_pending_idx
on public.alert_deliveries (
  status,
  next_attempt_at,
  created_at
);


create index
  alert_deliveries_user_created_idx
on public.alert_deliveries (
  user_id,
  created_at desc
);


create unique index
  alert_deliveries_provider_message_unique
on public.alert_deliveries (
  provider_message_id
)
where
  provider_message_id is not null;


-- ------------------------------------------------------------
-- 3. UPDATED_AT
-- ------------------------------------------------------------

create trigger
  alert_deliveries_set_updated_at
before update
on public.alert_deliveries
for each row
execute function
  public.ayzo_set_updated_at();


-- ------------------------------------------------------------
-- 4. EVENT -> PENDING DELIVERY
-- ------------------------------------------------------------
--
-- Only events created AFTER this migration are queued.
--
-- Historical events are intentionally not backfilled.
--
-- The delivery channel is snapshotted from the rule when
-- the event is created.
--
-- Disabled rules do not receive a delivery row.

create or replace function
  public.ayzo_enqueue_alert_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into
    public.alert_deliveries (
      alert_event_id,
      alert_rule_id,
      user_id,
      delivery_channel,
      status,
      attempt_count,
      max_attempts,
      next_attempt_at
    )
  select
    new.id,
    new.alert_rule_id,
    new.user_id,
    rule.delivery_channel,
    'pending',
    0,
    3,
    now()
  from
    public.alert_rules as rule
  where
    rule.id =
      new.alert_rule_id
    and rule.user_id =
      new.user_id
    and rule.enabled =
      true
  on conflict (
    alert_event_id,
    delivery_channel
  )
  do nothing;

  return new;
end;
$$;


revoke all
on function
  public.ayzo_enqueue_alert_delivery()
from public;

revoke all
on function
  public.ayzo_enqueue_alert_delivery()
from anon;

revoke all
on function
  public.ayzo_enqueue_alert_delivery()
from authenticated;


create trigger
  alert_events_enqueue_delivery
after insert
on public.alert_events
for each row
execute function
  public.ayzo_enqueue_alert_delivery();


-- ------------------------------------------------------------
-- 5. ATOMIC SERVER CLAIM
-- ------------------------------------------------------------
--
-- FOR UPDATE SKIP LOCKED prevents two workers from claiming
-- the same delivery.
--
-- A future provider adapter MUST use the delivery row id as
-- its stable provider idempotency key.
--
-- Processing rows are NOT automatically stolen in v1.
-- Crash recovery will only be enabled together with a
-- provider-level idempotency guarantee.

create or replace function
  public.ayzo_claim_alert_deliveries(
    p_limit integer,
    p_claim_token uuid
  )
returns setof
  public.alert_deliveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bounded_limit integer;
begin
  if
    p_claim_token is null
  then
    raise exception
      'claim token required';
  end if;

  if
    p_limit is null
    or p_limit < 1
    or p_limit > 25
  then
    raise exception
      'claim limit out of range';
  end if;

  bounded_limit :=
    p_limit;

  return query
  with candidates as (
    select
      delivery.id
    from
      public.alert_deliveries
        as delivery
    where
      (
        delivery.status =
          'pending'
        and
        delivery.next_attempt_at
          <= now()
      )
      or
      (
        delivery.status =
          'failed'
        and
        delivery.attempt_count
          < delivery.max_attempts
        and
        delivery.next_attempt_at
          is not null
        and
        delivery.next_attempt_at
          <= now()
      )
    order by
      delivery.next_attempt_at asc
        nulls last,
      delivery.created_at asc
    for update
      skip locked
    limit
      bounded_limit
  ),
  claimed as (
    update
      public.alert_deliveries
        as delivery
    set
      status =
        'processing',

      attempt_count =
        delivery.attempt_count + 1,

      claim_token =
        p_claim_token,

      claimed_at =
        now(),

      updated_at =
        now()

    from
      candidates

    where
      delivery.id =
        candidates.id

    returning
      delivery.*
  )

  select
    *
  from
    claimed;
end;
$$;


revoke all
on function
  public.ayzo_claim_alert_deliveries(
    integer,
    uuid
  )
from public;

revoke all
on function
  public.ayzo_claim_alert_deliveries(
    integer,
    uuid
  )
from anon;

revoke all
on function
  public.ayzo_claim_alert_deliveries(
    integer,
    uuid
  )
from authenticated;

grant execute
on function
  public.ayzo_claim_alert_deliveries(
    integer,
    uuid
  )
to service_role;


-- ------------------------------------------------------------
-- 6. RLS + GRANTS
-- ------------------------------------------------------------
--
-- Delivery ledger is operational server state.
--
-- Browser access is intentionally closed in v1.

alter table
  public.alert_deliveries
enable row level security;


revoke all
on table
  public.alert_deliveries
from anon;

revoke all
on table
  public.alert_deliveries
from authenticated;

grant
  select,
  insert,
  update,
  delete
on table
  public.alert_deliveries
to service_role;
