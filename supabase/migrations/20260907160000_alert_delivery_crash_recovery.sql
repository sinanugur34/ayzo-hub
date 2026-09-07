-- AYZO Alert Delivery Crash Recovery v1
--
-- This migration does NOT send notifications.
--
-- Resend provider requests use the stable alert-delivery UUID as
-- their Idempotency-Key.
--
-- Recovery policy:
--
-- - processing for less than 1 hour:
--     leave untouched
--
-- - processing for 1 to 20 hours:
--     may be reclaimed if retry budget remains
--
-- - processing for 20 hours or more:
--     never automatically resend
--     terminalize for operational review
--
-- The 20-hour ceiling deliberately stays inside the provider
-- idempotency retention window with additional safety margin.


-- ------------------------------------------------------------
-- 1. ATOMIC CLAIM + BOUNDED CRASH RECOVERY
-- ------------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- TERMINALIZE UNSAFE / EXHAUSTED STALE PROCESSING ROWS
  -- ----------------------------------------------------------
  --
  -- Once a processing row reaches the automatic-retry safety
  -- ceiling, AYZO must not automatically call the provider
  -- again because provider idempotency can no longer be relied
  -- on with sufficient margin.
  --
  -- A stale row that has already exhausted its attempt budget
  -- is also terminalized rather than reclaimed.
  -- ----------------------------------------------------------

  update
    public.alert_deliveries
  set
    status =
      'failed',

    claim_token =
      null,

    claimed_at =
      null,

    next_attempt_at =
      null,

    last_error_code =
      case
        when
          attempt_count >=
            max_attempts
        then
          'DELIVERY_STALE_ATTEMPTS_EXHAUSTED'
        else
          'DELIVERY_STALE_IDEMPOTENCY_WINDOW_EXPIRED'
      end,

    last_error_at =
      now(),

    updated_at =
      now()

  where
    status =
      'processing'

    and claimed_at is not null

    and claimed_at <=
      now() - interval '1 hour'

    and (
      attempt_count >=
        max_attempts

      or

      claimed_at <=
        now() - interval '20 hours'
    );


  -- ----------------------------------------------------------
  -- CLAIM
  -- ----------------------------------------------------------
  --
  -- Eligible rows:
  --
  -- 1. Normal pending delivery.
  -- 2. Scheduled retryable failure.
  -- 3. A processing row abandoned for at least one hour,
  --    still inside the bounded recovery window, with retry
  --    budget remaining.
  --
  -- FOR UPDATE SKIP LOCKED prevents concurrent workers from
  -- claiming the same row.
  -- ----------------------------------------------------------

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
        delivery.next_attempt_at <=
          now()
      )

      or

      (
        delivery.status =
          'failed'

        and
        delivery.attempt_count <
          delivery.max_attempts

        and
        delivery.next_attempt_at
          is not null

        and
        delivery.next_attempt_at <=
          now()
      )

      or

      (
        delivery.status =
          'processing'

        and
        delivery.claimed_at
          is not null

        and
        delivery.claimed_at <=
          now() - interval '1 hour'

        and
        delivery.claimed_at >
          now() - interval '20 hours'

        and
        delivery.attempt_count <
          delivery.max_attempts
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

      next_attempt_at =
        null,

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


-- ------------------------------------------------------------
-- 2. SERVER-ONLY EXECUTION
-- ------------------------------------------------------------

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
