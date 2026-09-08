-- AYZO Welcome Email Delivery v1
--
-- Goals:
--   - enqueue exactly once when auth.users receives a NEW user
--   - do not backfill existing users
--   - allow safe retry of retryable provider failures
--   - prevent concurrent duplicate sends
--   - keep ledger inaccessible to browser roles

create table if not exists public.welcome_email_deliveries (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'delivered',
        'failed'
      )
    ),

  retryable boolean not null default true,

  attempt_count integer not null default 0
    check (attempt_count >= 0),

  max_attempts integer not null default 3
    check (max_attempts between 1 and 10),

  claim_token uuid,
  claimed_at timestamptz,

  last_error_code text,
  provider_message_id text,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.welcome_email_deliveries
  enable row level security;

revoke all
  on public.welcome_email_deliveries
  from anon, authenticated;

grant all
  on public.welcome_email_deliveries
  to service_role;


create or replace function public.ayzo_enqueue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.welcome_email_deliveries (
    user_id
  )
  values (
    new.id
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all
  on function public.ayzo_enqueue_welcome_email()
  from public, anon, authenticated;


drop trigger if exists
  ayzo_auth_user_enqueue_welcome_email
  on auth.users;

create trigger ayzo_auth_user_enqueue_welcome_email
after insert
on auth.users
for each row
execute function public.ayzo_enqueue_welcome_email();


create or replace function public.ayzo_claim_welcome_email(
  p_user_id uuid,
  p_claim_token uuid
)
returns table (
  id uuid,
  user_id uuid,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.welcome_email_deliveries as delivery
  set
    status = 'processing',
    attempt_count =
      delivery.attempt_count + 1,
    claim_token =
      p_claim_token,
    claimed_at =
      now(),
    updated_at =
      now()
  where
    delivery.user_id =
      p_user_id
    and delivery.attempt_count <
      delivery.max_attempts
    and (
      delivery.status =
        'pending'
      or (
        delivery.status =
          'failed'
        and delivery.retryable =
          true
      )
      or (
        delivery.status =
          'processing'
        and delivery.claimed_at <
          now() - interval '10 minutes'
      )
    )
  returning
    delivery.id,
    delivery.user_id,
    delivery.attempt_count;
end;
$$;

revoke all
  on function public.ayzo_claim_welcome_email(uuid, uuid)
  from public, anon, authenticated;

grant execute
  on function public.ayzo_claim_welcome_email(uuid, uuid)
  to service_role;
