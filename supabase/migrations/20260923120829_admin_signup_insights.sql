begin;

create or replace function public.ayzo_admin_signup_insights()
returns table (
  dimension text,
  value text,
  total bigint
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  with users as (
    select
      u.id,
      u.created_at as user_created_at,
      s.signup_channel,
      s.device_class,
      s.os_family,
      s.country_code
    from auth.users u
    left join public.user_signup_source s
      on s.user_id = u.id
  ),
  summary as (
    select
      'tracking'::text as dimension,
      case
        when signup_channel is null
          then 'unknown'
        else 'recorded'
      end as value,
      count(*)::bigint as total
    from users
    group by 1, 2

    union all

    select
      'period',
      'last_7d',
      count(*)::bigint
    from users
    where user_created_at >=
      now() - interval '7 days'

    union all

    select
      'period',
      'last_30d',
      count(*)::bigint
    from users
    where user_created_at >=
      now() - interval '30 days'

    union all

    select
      'channel',
      coalesce(
        signup_channel,
        'unknown'
      ),
      count(*)::bigint
    from users
    group by 1, 2

    union all

    select
      'device',
      coalesce(
        device_class,
        'unknown'
      ),
      count(*)::bigint
    from users
    group by 1, 2

    union all

    select
      'os',
      coalesce(
        os_family,
        'unknown'
      ),
      count(*)::bigint
    from users
    group by 1, 2

    union all

    select
      'country',
      coalesce(
        country_code,
        'unknown'
      ),
      count(*)::bigint
    from users
    group by 1, 2
  )
  select
    dimension,
    value,
    total
  from summary
  order by
    dimension,
    total desc,
    value;
$$;

revoke all
on function public.ayzo_admin_signup_insights()
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_signup_insights()
to service_role;

comment on function public.ayzo_admin_signup_insights is
  'Server-only aggregate signup intelligence for the AYZO admin dashboard.';

commit;
