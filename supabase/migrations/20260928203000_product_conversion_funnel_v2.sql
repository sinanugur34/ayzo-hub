begin;

-- ============================================================
-- AYZO PRODUCT CONVERSION FUNNEL V2
--
-- Consent-backed product analytics.
--
-- NEVER STORE:
-- - wallet / token / contract addresses
-- - transaction hashes
-- - email addresses
-- - Ask AYZO question text
-- - analysis payloads
-- - purchase tokens
-- - payment secrets
-- - raw IP addresses
-- ============================================================

create table public.product_events (
  id uuid
    primary key
    default gen_random_uuid(),

  user_id uuid
    references auth.users(id)
    on delete set null,

  session_id uuid
    not null,

  event_name text
    not null
    check (
      char_length(event_name)
      between 1 and 80
    ),

  properties jsonb
    not null
    default '{}'::jsonb
    check (
      jsonb_typeof(properties) = 'object'
      and octet_length(properties::text) <= 2048
    ),

  created_at timestamptz
    not null
    default now()
);

create index product_events_created_idx
  on public.product_events(
    created_at desc
  );

create index product_events_event_created_idx
  on public.product_events(
    event_name,
    created_at desc
  );

create index product_events_session_created_idx
  on public.product_events(
    session_id,
    created_at desc
  );

create index product_events_user_created_idx
  on public.product_events(
    user_id,
    created_at desc
  );

alter table public.product_events
  enable row level security;

revoke all
on table public.product_events
from public, anon, authenticated;

-- The server-side Supabase admin client uses the service role.
-- Grant only the operations required by AYZO telemetry.
grant select, insert
on table public.product_events
to service_role;

comment on table public.product_events is
  'Server-only AYZO consent-backed product funnel telemetry. Raw analysis subjects, questions, email addresses, transaction hashes and payment secrets are prohibited.';

comment on column public.product_events.session_id is
  'Ephemeral browser-session UUID created only after analytics consent.';

create or replace function public.ayzo_admin_product_funnel(
  p_since timestamptz
)
returns table (
  event_name text,
  event_count bigint,
  session_count bigint,
  user_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    pe.event_name,
    count(*)::bigint as event_count,
    count(distinct pe.session_id)::bigint as session_count,
    count(distinct pe.user_id)::bigint as user_count
  from public.product_events pe
  where pe.created_at >= p_since
  group by pe.event_name
  order by pe.event_name;
$$;

revoke all
on function public.ayzo_admin_product_funnel(timestamptz)
from public, anon, authenticated;

grant execute
on function public.ayzo_admin_product_funnel(timestamptz)
to service_role;

commit;
