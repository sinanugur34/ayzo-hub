begin;

-- ============================================================
-- AYZO DEVICE PROTECTION V1 — SECURITY HARDENING
--
-- Fixes:
--   1. Unknown device tokens may bootstrap only when the account
--      has no device-ledger history at all.
--   2. Third-device eviction uses active_since, not last_seen_at.
--
-- Existing authenticated sessions from before Device Protection
-- may bootstrap once for an account with zero ledger history.
-- Once any ledger history exists, only a genuine authentication
-- callback may register a new device.
-- ============================================================


-- ------------------------------------------------------------
-- ACTIVE SESSION AGE
-- ------------------------------------------------------------

alter table
  public.account_device_sessions
add column
  active_since timestamptz;


update
  public.account_device_sessions
set
  active_since =
    created_at
where
  active_since is null;


alter table
  public.account_device_sessions
alter column
  active_since
set default now();


alter table
  public.account_device_sessions
alter column
  active_since
set not null;


create index
  account_device_sessions_active_since_idx
on public.account_device_sessions (
  user_id,
  active_since asc,
  id asc
)
where revoked_at is null;


-- ------------------------------------------------------------
-- REGISTER DEVICE
--
-- This remains the genuine-authentication registration path.
-- Existing active device -> refresh.
-- Revoked same token -> reject.
-- New genuine-login device -> insert.
-- Third active device -> revoke oldest ACTIVE session.
-- ------------------------------------------------------------

create or replace function
public.ayzo_register_account_device(
  p_user_id uuid,
  p_device_token_hash text,
  p_device_label text,
  p_user_agent_hash text,
  p_ip_hash text
)
returns table (
  session_id uuid,
  is_new boolean,
  revoked_session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing
    public.account_device_sessions%rowtype;

  v_session_id uuid;
  v_revoked_id uuid;
begin
  if p_user_id is null then
    raise exception
      'USER_ID_REQUIRED';
  end if;

  if p_device_token_hash is null
     or p_device_token_hash !~
       '^[a-f0-9]{64}$' then
    raise exception
      'INVALID_DEVICE_TOKEN_HASH';
  end if;

  if p_device_label is null
     or char_length(
       trim(p_device_label)
     ) not between 1 and 160 then
    raise exception
      'INVALID_DEVICE_LABEL';
  end if;


  perform pg_advisory_xact_lock(
    hashtextextended(
      p_user_id::text,
      0
    )
  );


  select *
  into v_existing
  from public.account_device_sessions
  where
    user_id =
      p_user_id
    and device_token_hash =
      p_device_token_hash
  limit 1;


  if found then
    if v_existing.revoked_at
       is not null then
      raise exception
        'DEVICE_SESSION_REVOKED';
    end if;


    update public.account_device_sessions
    set
      device_label =
        trim(p_device_label),

      user_agent_hash =
        p_user_agent_hash,

      ip_hash =
        p_ip_hash,

      last_login_at =
        now(),

      last_seen_at =
        now()

    where id =
      v_existing.id;


    return query
    select
      v_existing.id,
      false,
      null::uuid;

    return;
  end if;


  insert into public.account_device_sessions (
    user_id,
    device_token_hash,
    device_label,
    user_agent_hash,
    ip_hash,
    active_since
  )
  values (
    p_user_id,
    p_device_token_hash,
    trim(p_device_label),
    p_user_agent_hash,
    p_ip_hash,
    now()
  )
  returning id
  into v_session_id;


  if (
    select count(*)
    from public.account_device_sessions
    where
      user_id =
        p_user_id
      and revoked_at
        is null
  ) > 2 then

    select id
    into v_revoked_id
    from public.account_device_sessions
    where
      user_id =
        p_user_id
      and revoked_at
        is null
      and id <>
        v_session_id
    order by
      active_since asc,
      created_at asc,
      id asc
    limit 1;


    if v_revoked_id
       is not null then
      update public.account_device_sessions
      set
        revoked_at =
          now(),

        revoke_reason =
          'device_limit'

      where id =
        v_revoked_id
        and revoked_at
          is null;
    end if;
  end if;


  insert into
    public.account_device_notifications (
      user_id,
      recipient_device_session_id,
      event_type,
      actor_device_label
    )
  select
    p_user_id,
    device.id,
    'new_device_login',
    trim(p_device_label)
  from public.account_device_sessions
    as device
  where
    device.user_id =
      p_user_id
    and device.revoked_at
      is null
    and device.id <>
      v_session_id;


  return query
  select
    v_session_id,
    true,
    v_revoked_id;
end;
$$;


revoke all
on function
  public.ayzo_register_account_device(
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon, authenticated;


grant execute
on function
  public.ayzo_register_account_device(
    uuid,
    text,
    text,
    text,
    text
  )
to service_role;


-- ------------------------------------------------------------
-- ONE-TIME LEGACY SESSION BOOTSTRAP
--
-- Security invariant:
--   Bootstrap is allowed ONLY when the account has zero device
--   ledger rows, including revoked historical rows.
--
-- Therefore deleting/replacing the HttpOnly device cookie after
-- a device was revoked cannot create a fresh device session.
-- Genuine new authentication continues to use
-- ayzo_register_account_device instead.
-- ------------------------------------------------------------

create or replace function
public.ayzo_bootstrap_account_device(
  p_user_id uuid,
  p_device_token_hash text,
  p_device_label text,
  p_user_agent_hash text,
  p_ip_hash text
)
returns table (
  session_id uuid,
  is_new boolean,
  revoked_session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_user_id is null then
    raise exception
      'USER_ID_REQUIRED';
  end if;

  if p_device_token_hash is null
     or p_device_token_hash !~
       '^[a-f0-9]{64}$' then
    raise exception
      'INVALID_DEVICE_TOKEN_HASH';
  end if;

  if p_device_label is null
     or char_length(
       trim(p_device_label)
     ) not between 1 and 160 then
    raise exception
      'INVALID_DEVICE_LABEL';
  end if;


  perform pg_advisory_xact_lock(
    hashtextextended(
      p_user_id::text,
      0
    )
  );


  if exists (
    select 1
    from public.account_device_sessions
    where user_id =
      p_user_id
  ) then
    raise exception
      'DEVICE_BOOTSTRAP_NOT_ALLOWED';
  end if;


  insert into public.account_device_sessions (
    user_id,
    device_token_hash,
    device_label,
    user_agent_hash,
    ip_hash,
    active_since
  )
  values (
    p_user_id,
    p_device_token_hash,
    trim(p_device_label),
    p_user_agent_hash,
    p_ip_hash,
    now()
  )
  returning id
  into v_session_id;


  return query
  select
    v_session_id,
    true,
    null::uuid;
end;
$$;


revoke all
on function
  public.ayzo_bootstrap_account_device(
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon, authenticated;


grant execute
on function
  public.ayzo_bootstrap_account_device(
    uuid,
    text,
    text,
    text,
    text
  )
to service_role;


comment on function
  public.ayzo_bootstrap_account_device(
    uuid,
    text,
    text,
    text,
    text
  )
is
  'One-time legacy-session bootstrap. Allowed only when the account has zero device-session history. Prevents cookie-reset bypass after device revocation.';


commit;
