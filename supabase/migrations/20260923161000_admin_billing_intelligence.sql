begin;

create or replace function public.ayzo_admin_list_users_v2(
  p_page integer default 1,
  p_per_page integer default 50,
  p_email_search text default null,
  p_signup_channel text default null,
  p_device_class text default null,
  p_os_family text default null,
  p_country_code text default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null,
  p_plan text default null,
  p_provider text default null,
  p_subscription_status text default null,
  p_billing_interval text default null
)
returns table (
  user_id uuid,
  email text,
  user_created_at timestamptz,
  last_sign_in_at timestamptz,
  signup_channel text,
  device_class text,
  os_family text,
  country_code text,
  signup_recorded_at timestamptz,
  current_plan text,
  subscription_provider text,
  subscription_status text,
  billing_interval text,
  locked_price_usd_cents integer,
  current_period_end timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  with base as (
    select
      u.id as user_id,
      u.email::text as email,
      u.created_at as user_created_at,
      u.last_sign_in_at,

      coalesce(
        ss.signup_channel,
        'unknown'
      ) as signup_channel,

      coalesce(
        ss.device_class,
        'unknown'
      ) as device_class,

      coalesce(
        ss.os_family,
        'unknown'
      ) as os_family,

      coalesce(
        ss.country_code,
        'unknown'
      ) as country_code,

      ss.created_at as signup_recorded_at,

      latest.provider as subscription_provider,
      latest.status as subscription_status,
      latest.billing_interval,
      latest.locked_price_usd_cents,
      latest.current_period_end,

      case
        when effective.plan_id = 'advanced'
          then 'advanced'
        when effective.plan_id = 'pro'
          then 'pro'
        else 'free'
      end as current_plan

    from auth.users u

    left join public.user_signup_source ss
      on ss.user_id = u.id

    left join lateral (
      select
        s.provider,
        s.status,
        s.billing_interval,
        s.locked_price_usd_cents,
        s.current_period_end
      from public.subscriptions s
      where s.user_id = u.id
      order by
        s.created_at desc,
        s.id desc
      limit 1
    ) latest
      on true

    left join lateral (
      select
        s.plan_id
      from public.subscriptions s
      where
        s.user_id = u.id
        and s.status in (
          'active',
          'canceling'
        )
        and s.current_period_end is not null
        and s.current_period_end > now()
      order by
        case
          when s.plan_id = 'advanced'
            then 2
          else 1
        end desc,
        s.current_period_end desc,
        s.created_at desc
      limit 1
    ) effective
      on true
  ),
  filtered as (
    select *
    from base
    where
      (
        nullif(
          trim(p_email_search),
          ''
        ) is null
        or email ilike
          '%' ||
          trim(p_email_search) ||
          '%'
      )

      and (
        p_signup_channel is null
        or signup_channel =
          p_signup_channel
      )

      and (
        p_device_class is null
        or device_class =
          p_device_class
      )

      and (
        p_os_family is null
        or os_family =
          p_os_family
      )

      and (
        p_country_code is null
        or country_code =
          p_country_code
      )

      and (
        p_created_from is null
        or user_created_at >=
          p_created_from
      )

      and (
        p_created_to is null
        or user_created_at <
          p_created_to
      )

      and (
        p_plan is null
        or current_plan =
          p_plan
      )

      and (
        p_provider is null
        or subscription_provider =
          p_provider
      )

      and (
        p_subscription_status is null
        or subscription_status =
          p_subscription_status
      )

      and (
        p_billing_interval is null
        or billing_interval =
          p_billing_interval
      )
  )

  select
    filtered.user_id,
    filtered.email,
    filtered.user_created_at,
    filtered.last_sign_in_at,
    filtered.signup_channel,
    filtered.device_class,
    filtered.os_family,
    filtered.country_code,
    filtered.signup_recorded_at,
    filtered.current_plan,
    filtered.subscription_provider,
    filtered.subscription_status,
    filtered.billing_interval,
    filtered.locked_price_usd_cents,
    filtered.current_period_end,
    count(*) over() as total_count

  from filtered

  order by
    filtered.user_created_at desc,
    filtered.user_id desc

  limit least(
    greatest(
      coalesce(
        p_per_page,
        50
      ),
      1
    ),
    100
  )

  offset (
    greatest(
      coalesce(
        p_page,
        1
      ),
      1
    ) - 1
  ) *
  least(
    greatest(
      coalesce(
        p_per_page,
        50
      ),
      1
    ),
    100
  );
$$;


create or replace function public.ayzo_admin_billing_insights()
returns table (
  metric text,
  value bigint
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  with effective as (
    select distinct on (
      s.user_id
    )
      s.user_id,
      s.provider,
      s.plan_id,
      s.billing_interval,
      s.status,
      s.locked_price_usd_cents,
      s.current_period_end
    from public.subscriptions s
    where
      s.status in (
        'active',
        'canceling'
      )
      and s.current_period_end is not null
      and s.current_period_end > now()
    order by
      s.user_id,
      case
        when s.plan_id = 'advanced'
          then 2
        else 1
      end desc,
      s.current_period_end desc,
      s.created_at desc
  )

  select
    'active_subscriptions',
    count(*)::bigint
  from effective

  union all

  select
    'pro',
    count(*)::bigint
  from effective
  where plan_id = 'pro'

  union all

  select
    'advanced',
    count(*)::bigint
  from effective
  where plan_id = 'advanced'

  union all

  select
    'google_play',
    count(*)::bigint
  from effective
  where provider = 'google_play'

  union all

  select
    'creem',
    count(*)::bigint
  from effective
  where provider = 'creem'

  union all

  select
    'monthly',
    count(*)::bigint
  from effective
  where billing_interval = 'monthly'

  union all

  select
    'annual',
    count(*)::bigint
  from effective
  where billing_interval = 'annual'

  union all

  select
    'canceling',
    count(*)::bigint
  from effective
  where status = 'canceling'

  union all

  select
    'mrr_equivalent_usd_cents',
    coalesce(
      sum(
        case
          when billing_interval = 'annual'
            then round(
              locked_price_usd_cents /
              12.0
            )
          else
            locked_price_usd_cents
        end
      ),
      0
    )::bigint
  from effective;
$$;


revoke all
on function public.ayzo_admin_list_users_v2(
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_list_users_v2(
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text
)
to service_role;


revoke all
on function public.ayzo_admin_billing_insights()
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_billing_insights()
to service_role;


comment on function public.ayzo_admin_list_users_v2 is
  'Server-only admin user directory with signup and billing filters.';

comment on function public.ayzo_admin_billing_insights is
  'Server-only effective subscription and MRR-equivalent aggregates.';

commit;
