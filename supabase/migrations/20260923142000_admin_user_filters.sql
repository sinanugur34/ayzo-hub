begin;

create or replace function public.ayzo_admin_list_users(
  p_page integer default 1,
  p_per_page integer default 50,
  p_email_search text default null,
  p_signup_channel text default null,
  p_device_class text default null,
  p_os_family text default null,
  p_country_code text default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null
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
  total_count bigint
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  with filtered as (
    select
      u.id as user_id,
      u.email::text as email,
      u.created_at as user_created_at,
      u.last_sign_in_at,
      coalesce(
        s.signup_channel,
        'unknown'
      ) as signup_channel,
      coalesce(
        s.device_class,
        'unknown'
      ) as device_class,
      coalesce(
        s.os_family,
        'unknown'
      ) as os_family,
      coalesce(
        s.country_code,
        'unknown'
      ) as country_code,
      s.created_at as signup_recorded_at
    from auth.users u
    left join public.user_signup_source s
      on s.user_id = u.id
    where
      (
        nullif(
          trim(p_email_search),
          ''
        ) is null
        or u.email ilike
          '%' ||
          trim(p_email_search) ||
          '%'
      )
      and (
        p_signup_channel is null
        or coalesce(
          s.signup_channel,
          'unknown'
        ) = p_signup_channel
      )
      and (
        p_device_class is null
        or coalesce(
          s.device_class,
          'unknown'
        ) = p_device_class
      )
      and (
        p_os_family is null
        or coalesce(
          s.os_family,
          'unknown'
        ) = p_os_family
      )
      and (
        p_country_code is null
        or coalesce(
          s.country_code,
          'unknown'
        ) = p_country_code
      )
      and (
        p_created_from is null
        or u.created_at >=
          p_created_from
      )
      and (
        p_created_to is null
        or u.created_at <
          p_created_to
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

revoke all
on function public.ayzo_admin_list_users(
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_list_users(
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
to service_role;

comment on function public.ayzo_admin_list_users is
  'Server-only paginated AYZO admin user directory with normalized signup filters.';

commit;
