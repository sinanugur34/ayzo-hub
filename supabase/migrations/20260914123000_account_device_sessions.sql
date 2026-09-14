begin;

-- ============================================================
-- AYZO ACCOUNT DEVICE PROTECTION V1
--
-- Individual AYZO accounts may have at most two active devices.
--
-- Security properties:
--   - raw device tokens are never stored
--   - raw IP addresses are never stored
--   - browser roles cannot access this ledger
--   - registration is serialized per user
--   - third distinct device revokes the oldest active device
-- ============================================================

do $$
begin
  if to_regclass(
    'public.account_device_sessions'
  ) is not null then
    raise exception
      'public.account_device_sessions already exists. Migration aborted.';
  end if;

  if to_regclass(
    'public.account_device_notifications'
  ) is not null then
    raise exception
      'public.account_device_notifications already exists. Migration aborted.';
  end if;
end
$$;


create table public.account_device_sessions (
  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  device_token_hash text not null
    check (
      device_token_hash ~
        '^[a-f0-9]{64}$'
    ),

  device_label text not null
    check (
      char_length(
        trim(device_label)
      )
      between 1 and 160
    ),

  user_agent_hash text
    check (
      user_agent_hash is null
      or user_agent_hash ~
        '^[a-f0-9]{64}$'
    ),

  ip_hash text
    check (
      ip_hash is null
      or ip_hash ~
        '^[a-f0-9]{64}$'
    ),

  created_at timestamptz
    not null
    default now(),

  last_login_at timestamptz
    not null
    default now(),

  last_seen_at timestamptz
    not null
    default now(),

  revoked_at timestamptz,

  revoke_reason text
    check (
      revoke_reason is null
      or revoke_reason in (
        'device_limit',
        'user_signout',
        'user_revoked',
        'security_reset'
      )
    ),

  unique (
    user_id,
    device_token_hash
  ),

  check (
    (
      revoked_at is null
      and revoke_reason is null
    )
    or (
      revoked_at is not null
      and revoke_reason is not null
    )
  )
);


create index
  account_device_sessions_active_idx
on public.account_device_sessions (
  user_id,
  last_seen_at desc
)
where revoked_at is null;


create table public.account_device_notifications (
  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  recipient_device_session_id uuid not null
    references public.account_device_sessions(id)
    on delete cascade,

  event_type text not null
    check (
      event_type in (
        'new_device_login'
      )
    ),

  actor_device_label text not null
    check (
      char_length(
        trim(actor_device_label)
      )
      between 1 and 160
    ),

  created_at timestamptz
    not null
    default now(),

  seen_at timestamptz
);


create index
  account_device_notifications_unseen_idx
on public.account_device_notifications (
  recipient_device_session_id,
  created_at desc
)
where seen_at is null;


-- ============================================================
-- RLS / PRIVILEGES
-- ============================================================

alter table
  public.account_device_sessions
enable row level security;

alter table
  public.account_device_notifications
enable row level security;


revoke all
on table public.account_device_sessions
from anon, authenticated;

revoke all
on table public.account_device_notifications
from anon, authenticated;


grant all
on table public.account_device_sessions
to service_role;

grant all
on table public.account_device_notifications
to service_role;


-- ============================================================
-- REGISTER / REFRESH DEVICE
--
-- Returns:
--   session_id
--   is_new
--   revoked_session_id
--
-- Existing device:
--   refreshes metadata and reactivates only if it was not revoked.
--
-- New device:
--   creates a new session,
--   enforces max 2 active sessions,
--   notifies the remaining active device.
-- ============================================================

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

  /*
   * Serialize device registration for one user.
   * Prevents concurrent third-device logins from
   * temporarily exceeding the two-device contract.
   */
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
    /*
     * A device revoked by policy must not silently
     * reactivate using its old cookie. A fresh
     * device token is required after a new login.
     */
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
    ip_hash
  )
  values (
    p_user_id,
    p_device_token_hash,
    trim(p_device_label),
    p_user_agent_hash,
    p_ip_hash
  )
  returning id
  into v_session_id;


  /*
   * If this is the third distinct active device,
   * revoke exactly the oldest other active device.
   */
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
      last_seen_at asc,
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


  /*
   * Notify every remaining active device
   * except the device that just logged in.
   */
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


-- ============================================================
-- TOUCH CURRENT DEVICE
-- ============================================================

create or replace function
public.ayzo_touch_account_device(
  p_user_id uuid,
  p_device_token_hash text
)
returns table (
  session_id uuid,
  active boolean,
  revoke_reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.account_device_sessions
    as device
  set
    last_seen_at =
      case
        when device.revoked_at
          is null
        then now()
        else device.last_seen_at
      end
  where
    device.user_id =
      p_user_id
    and device.device_token_hash =
      p_device_token_hash
  returning
    device.id,
    device.revoked_at
      is null,
    device.revoke_reason;
end;
$$;


revoke all
on function
  public.ayzo_touch_account_device(
    uuid,
    text
  )
from public, anon, authenticated;

grant execute
on function
  public.ayzo_touch_account_device(
    uuid,
    text
  )
to service_role;


-- ============================================================
-- REVOKE CURRENT DEVICE
-- ============================================================

create or replace function
public.ayzo_revoke_account_device(
  p_user_id uuid,
  p_device_token_hash text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_reason not in (
    'user_signout',
    'user_revoked',
    'security_reset'
  ) then
    raise exception
      'INVALID_REVOKE_REASON';
  end if;

  update public.account_device_sessions
  set
    revoked_at =
      coalesce(
        revoked_at,
        now()
      ),

    revoke_reason =
      coalesce(
        revoke_reason,
        p_reason
      )

  where
    user_id =
      p_user_id
    and device_token_hash =
      p_device_token_hash;

  get diagnostics
    v_updated =
      row_count;

  return
    v_updated > 0;
end;
$$;


revoke all
on function
  public.ayzo_revoke_account_device(
    uuid,
    text,
    text
  )
from public, anon, authenticated;

grant execute
on function
  public.ayzo_revoke_account_device(
    uuid,
    text,
    text
  )
to service_role;


comment on table
  public.account_device_sessions
is
  'Server-only AYZO account device-session ledger enforcing the individual two-active-device policy. Raw device tokens and raw IP addresses are never stored.';

comment on table
  public.account_device_notifications
is
  'Server-only security notification ledger for AYZO device-login events.';

commit;
