begin;

-- ============================================================
-- AYZO ALERT DETECTION STATE + EVENT LEDGER
--
-- Purpose:
--   1. Persist the latest server-observed state per alert rule.
--   2. Persist idempotent evidence-backed alert events.
--
-- Security:
--   - Detection state is server-only.
--   - Alert events are read-only to their authenticated owner.
--   - Browser clients cannot insert/update/delete detector state
--     or alert events.
--
-- Delivery:
--   - No email/browser/Telegram delivery is implemented here.
--
-- Monitoring:
--   - No cron/worker/provider polling is implemented here.
-- ============================================================


-- ------------------------------------------------------------
-- 1. PARENT OWNERSHIP KEY
--
-- Allows child rows to guarantee that user_id matches
-- the owning alert rule.
-- ------------------------------------------------------------

create unique index
  alert_rules_id_user_uidx
on public.alert_rules(
  id,
  user_id
);


-- ------------------------------------------------------------
-- 2. ALERT DETECTION STATE
-- ------------------------------------------------------------

create table public.alert_detection_state (
  alert_rule_id uuid primary key,

  user_id uuid not null,

  state_version smallint not null
    default 1
    check (
      state_version = 1
    ),

  state_hash text not null
    check (
      char_length(state_hash) = 64
    ),

  snapshot jsonb not null
    check (
      jsonb_typeof(snapshot) = 'object'
    ),

  observed_at timestamptz not null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint
    alert_detection_state_rule_owner_fk
  foreign key (
    alert_rule_id,
    user_id
  )
  references public.alert_rules(
    id,
    user_id
  )
  on delete cascade
);

create index
  alert_detection_state_user_idx
on public.alert_detection_state(
  user_id,
  updated_at desc
);

create trigger
  alert_detection_state_set_updated_at
before update
on public.alert_detection_state
for each row
execute function
  public.ayzo_set_updated_at();


-- ------------------------------------------------------------
-- 3. ALERT EVENT LEDGER
-- ------------------------------------------------------------

create table public.alert_events (
  id uuid primary key
    default gen_random_uuid(),

  alert_rule_id uuid not null,

  user_id uuid not null,

  event_key text not null
    check (
      char_length(event_key) = 64
    ),

  event_type text not null
    check (
      event_type in (
        'new_activity',
        'funding_movement',
        'relationship_change',
        'contract_activity'
      )
    ),

  previous_state_hash text
    check (
      previous_state_hash is null
      or char_length(
        previous_state_hash
      ) = 64
    ),

  current_state_hash text not null
    check (
      char_length(
        current_state_hash
      ) = 64
    ),

  evidence_state text not null
    default 'SUPPORTED'
    check (
      evidence_state = 'SUPPORTED'
    ),

  evidence_refs jsonb not null
    default '[]'::jsonb
    check (
      jsonb_typeof(
        evidence_refs
      ) = 'array'
    ),

  event_payload jsonb not null
    default '{}'::jsonb
    check (
      jsonb_typeof(
        event_payload
      ) = 'object'
    ),

  detected_at timestamptz not null,

  created_at timestamptz not null
    default now(),

  constraint
    alert_events_rule_owner_fk
  foreign key (
    alert_rule_id,
    user_id
  )
  references public.alert_rules(
    id,
    user_id
  )
  on delete cascade,

  unique (
    alert_rule_id,
    event_key
  )
);

create index
  alert_events_user_created_idx
on public.alert_events(
  user_id,
  created_at desc
);

create index
  alert_events_rule_created_idx
on public.alert_events(
  alert_rule_id,
  created_at desc
);


-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------

alter table
  public.alert_detection_state
enable row level security;

alter table
  public.alert_events
enable row level security;


/*
 * alert_detection_state intentionally receives
 * NO authenticated browser policy.
 *
 * It is server-managed detector state.
 */


create policy
  alert_events_select_own
on public.alert_events
for select
to authenticated
using (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- 5. PRIVILEGES
-- ------------------------------------------------------------

revoke all
on table
  public.alert_detection_state,
  public.alert_events
from anon;

revoke all
on table
  public.alert_detection_state,
  public.alert_events
from authenticated;

grant select
on table
  public.alert_events
to authenticated;


/* Detection state remains server-only. */


-- ------------------------------------------------------------
-- 6. COMMENTS
-- ------------------------------------------------------------

comment on table
  public.alert_detection_state
is
  'Server-only latest normalized evidence state for an AYZO alert rule. Used for deterministic change detection.';

comment on table
  public.alert_events
is
  'Evidence-backed idempotent AYZO alert-event ledger. Authenticated owners may read their events; writes are server-only.';

comment on column
  public.alert_events.event_key
is
  'Deterministic SHA-256 key derived from the rule type and newly observed evidence references.';

comment on column
  public.alert_events.evidence_state
is
  'Alert events require SUPPORTED evidence. No inferred evidence may create an event.';

commit;
