begin;

-- ============================================================
-- AYZO ADMIN AUTHENTICATED ATTRIBUTION V4-B
--
-- Purpose:
--   Aggregate authenticated product-event users by the
--   normalized signup metadata that AYZO already stores.
--
-- Privacy:
--   - no email
--   - no raw user id returned
--   - no IP
--   - no user-agent
--   - no wallet / token / tx subject
--   - only aggregate counts
--
-- Semantics:
--   Only product_events rows with user_id are attributable.
--   Missing signup metadata remains explicitly "unknown".
-- ============================================================

create or replace function public.ayzo_admin_authenticated_attribution(
  p_since timestamptz
)
returns table (
  metric text,
  dimension text,
  value text,
  total bigint
)
language sql
security invoker
set search_path = ''
as $$
  with authenticated_events as (
    select
      pe.user_id,
      pe.event_name
    from public.product_events pe
    where
      pe.created_at >= p_since
      and pe.user_id is not null
  ),

  event_users as (
    select distinct
      ae.user_id,
      ae.event_name
    from authenticated_events ae
  ),

  attributed_users as (
    select
      eu.user_id,
      eu.event_name,

      coalesce(
        ss.signup_channel,
        'unknown'
      ) as signup_channel,

      coalesce(
        ss.device_class,
        'unknown'
      ) as device_class,

      coalesce(
        ss.country_code,
        'unknown'
      ) as country_code,

      (
        ss.user_id is not null
      ) as has_signup_source

    from event_users eu

    left join public.user_signup_source ss
      on ss.user_id = eu.user_id
  ),

  all_authenticated_users as (
    select distinct
      ae.user_id
    from authenticated_events ae
  ),

  coverage as (
    select
      'coverage'::text as metric,
      'tracking'::text as dimension,

      case
        when ss.user_id is null
          then 'unknown'
        else 'recorded'
      end as value,

      count(*)::bigint as total

    from all_authenticated_users au

    left join public.user_signup_source ss
      on ss.user_id = au.user_id

    group by 1, 2, 3
  ),

  by_channel as (
    select
      au.event_name::text as metric,
      'channel'::text as dimension,
      au.signup_channel::text as value,
      count(*)::bigint as total

    from attributed_users au

    group by
      au.event_name,
      au.signup_channel
  ),

  by_device as (
    select
      au.event_name::text as metric,
      'device'::text as dimension,
      au.device_class::text as value,
      count(*)::bigint as total

    from attributed_users au

    group by
      au.event_name,
      au.device_class
  ),

  by_country as (
    select
      au.event_name::text as metric,
      'country'::text as dimension,
      au.country_code::text as value,
      count(*)::bigint as total

    from attributed_users au

    group by
      au.event_name,
      au.country_code
  )

  select * from coverage

  union all

  select * from by_channel

  union all

  select * from by_device

  union all

  select * from by_country

  order by
    metric,
    dimension,
    total desc,
    value;
$$;

revoke all
on function public.ayzo_admin_authenticated_attribution(timestamptz)
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_authenticated_attribution(timestamptz)
to service_role;

comment on function public.ayzo_admin_authenticated_attribution is
  'Server-only aggregate authenticated product conversion attribution. Returns no raw user identifiers or sensitive analysis subjects.';

commit;
