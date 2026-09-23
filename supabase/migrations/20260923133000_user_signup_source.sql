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

  created_at timestamptz
    not null
    default now()
);

alter table public.user_signup_source
  enable row level security;

revoke all
on table public.user_signup_source
from anon, authenticated;

comment on table public.user_signup_source is
  'Server-only normalized AYZO account signup source metadata. No raw user-agent or IP is stored.';

commit;
