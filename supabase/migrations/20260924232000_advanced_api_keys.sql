begin;

-- ============================================================
-- AYZO ADVANCED API KEYS
--
-- Raw API keys are NEVER stored.
-- Only SHA-256 digests and safe display prefixes are persisted.
-- Browser/mobile clients have no direct table privileges.
-- ============================================================

do $$
begin
  if to_regclass('public.api_keys') is not null then
    raise exception
      'public.api_keys already exists. Migration aborted.';
  end if;
end
$$;

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name))
      between 1 and 80
    ),

  key_prefix text not null
    check (
      char_length(key_prefix)
      between 10 and 32
    ),

  key_hash text not null unique
    check (
      key_hash ~ '^[0-9a-f]{64}$'
    ),

  created_at timestamptz not null
    default now(),

  last_used_at timestamptz,

  revoked_at timestamptz
);

create unique index api_keys_one_active_per_user_idx
  on public.api_keys(user_id)
  where revoked_at is null;

create index api_keys_user_created_idx
  on public.api_keys(
    user_id,
    created_at desc
  );

alter table public.api_keys
  enable row level security;

-- Service-role only.
-- Account/API routes enforce ownership server-side.
revoke all
on table public.api_keys
from anon, authenticated;

-- Public API traffic receives its own operational origin.
alter table public.analysis_activity
  drop constraint if exists analysis_activity_platform_check;

alter table public.analysis_activity
  add constraint analysis_activity_platform_check
  check (
    platform in (
      'web',
      'android',
      'ios',
      'api'
    )
  );

comment on table public.api_keys is
  'Server-only AYZO Advanced API key metadata. Raw API secrets are never stored.';

comment on column public.api_keys.key_hash is
  'SHA-256 digest of the high-entropy AYZO API key.';

comment on column public.api_keys.key_prefix is
  'Non-secret prefix shown to the account owner for key identification.';

commit;
