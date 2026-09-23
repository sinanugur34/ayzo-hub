begin;

-- ============================================================
-- AYZO ANALYSIS ACTIVITY LEDGER
--
-- Server-authoritative operational analytics.
--
-- Intentionally NOT stored:
-- - wallet / token / contract addresses
-- - transaction hashes
-- - email addresses
-- - Ask AYZO question text
-- - purchase tokens
-- - order ids
-- - payment secrets
-- ============================================================

create table public.analysis_activity (
  id uuid primary key default gen_random_uuid(),

  user_id uuid
    references auth.users(id)
    on delete set null,

  platform text not null
    check (
      platform in (
        'web',
        'android',
        'ios'
      )
    ),

  network text not null
    check (
      char_length(trim(network))
      between 1 and 64
    ),

  plan_id text not null
    check (
      plan_id in (
        'free',
        'pro',
        'advanced'
      )
    ),

  outcome text not null
    check (
      outcome in (
        'completed',
        'failed',
        'quota_blocked'
      )
    ),

  http_status integer
    check (
      http_status is null
      or (
        http_status >= 100
        and http_status <= 599
      )
    ),

  failure_code text
    check (
      failure_code is null
      or char_length(failure_code) <= 120
    ),

  quota_limit integer
    check (
      quota_limit is null
      or quota_limit >= 0
    ),

  quota_remaining integer
    check (
      quota_remaining is null
      or quota_remaining >= 0
    ),

  quota_reset_at timestamptz,

  created_at timestamptz
    not null
    default now()
);

create index analysis_activity_user_created_idx
  on public.analysis_activity(
    user_id,
    created_at desc
  );

create index analysis_activity_platform_created_idx
  on public.analysis_activity(
    platform,
    created_at desc
  );

create index analysis_activity_network_created_idx
  on public.analysis_activity(
    network,
    created_at desc
  );

create index analysis_activity_plan_created_idx
  on public.analysis_activity(
    plan_id,
    created_at desc
  );

create index analysis_activity_outcome_created_idx
  on public.analysis_activity(
    outcome,
    created_at desc
  );

alter table public.analysis_activity
  enable row level security;

-- Browser/mobile clients receive no direct access.
-- Only the Supabase service-role admin client may use it.

revoke all
on table public.analysis_activity
from anon, authenticated;

comment on table public.analysis_activity is
  'Server-only AYZO analysis activity ledger. Contains operational product metadata and quota state, not analysis subjects or user-entered sensitive content.';

comment on column public.analysis_activity.user_id is
  'Authenticated AYZO account UUID when known. Null supports anonymous web activity without creating a user identity.';

comment on column public.analysis_activity.platform is
  'Originating AYZO client: web, android, or ios.';

comment on column public.analysis_activity.quota_remaining is
  'Remaining analysis quota observed by the server after quota consumption when available.';

commit;
