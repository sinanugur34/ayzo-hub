begin;

create table public.user_signup_source (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  signup_channel text not null
    check (
      signup_channel in (
        'web',
        'android',
        'ios',
        'unknown'
      )
    ),

  device_class text not null
    check (
      device_class in (
        'desktop',
        'phone',
        'tablet',
        'unknown'
      )
    ),

  os_family text not null
    check (
      os_family in (
        'windows',
        'macos',
        'linux',
        'android',
        'ios',
        'other',
        'unknown'
      )
    ),

  country_code text
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  source_version integer
    not null
    default 1
    check (
      source_version >= 1
    ),

  created_at timestamptz
    not null
    default now()
);

create index user_signup_source_channel_created_idx
  on public.user_signup_source(
    signup_channel,
    created_at desc
  );

create index user_signup_source_device_created_idx
  on public.user_signup_source(
    device_class,
    created_at desc
  );

create index user_signup_source_os_created_idx
  on public.user_signup_source(
    os_family,
    created_at desc
  );

create index user_signup_source_country_created_idx
  on public.user_signup_source(
    country_code,
    created_at desc
  );

alter table public.user_signup_source
  enable row level security;

revoke all
on table public.user_signup_source
from anon, authenticated;

comment on table public.user_signup_source is
  'Server-only normalized AYZO account signup source metadata. No raw user-agent or IP is stored.';

commit;
