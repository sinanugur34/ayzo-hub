begin;

-- ============================================================
-- AYZO V1.1 — AUTOMATIC EVIDENCE SNAPSHOTS
--
-- Automatic evidence memory is intentionally separate from
-- manually curated saved_analyses.
--
-- Authenticated browser:
--   SELECT own paid-plan evidence history only.
--
-- Mutations:
--   AYZO server/service-role only.
-- ============================================================

create table public.evidence_snapshots (
  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  network text not null
    check (
      char_length(trim(network))
      between 1 and 64
    ),

  subject_type text not null
    check (
      subject_type in (
        'wallet',
        'token',
        'transaction',
        'entity',
        'protocol'
      )
    ),

  subject_value text not null
    check (
      char_length(trim(subject_value))
      between 1 and 512
    ),

  snapshot jsonb not null
    check (
      octet_length(
        snapshot::text
      ) <= 131072
    ),

  snapshot_hash text not null
    check (
      snapshot_hash ~ '^[0-9a-f]{64}$'
    ),

  dedupe_bucket bigint not null
    check (
      dedupe_bucket >= 0
    ),

  captured_at timestamptz not null,

  created_at timestamptz not null
    default now(),

  constraint evidence_snapshots_dedupe_key
    unique (
      user_id,
      network,
      subject_type,
      subject_value,
      snapshot_hash,
      dedupe_bucket
    )
);

create index evidence_snapshots_subject_history_idx
  on public.evidence_snapshots (
    user_id,
    network,
    subject_type,
    subject_value,
    captured_at desc
  );

create index evidence_snapshots_user_recent_idx
  on public.evidence_snapshots (
    user_id,
    captured_at desc
  );

alter table public.evidence_snapshots
  enable row level security;

revoke all
on table public.evidence_snapshots
from anon, authenticated;

grant select
on table public.evidence_snapshots
to authenticated;

grant
  select,
  insert,
  delete
on table public.evidence_snapshots
to service_role;

create policy evidence_snapshots_select_paid_own
on public.evidence_snapshots
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.plan_id in (
        'pro',
        'advanced'
      )
      and s.status in (
        'active',
        'canceling'
      )
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);

comment on table public.evidence_snapshots is
  'Bounded automatic AYZO Evidence Change baselines for Pro and Advanced accounts.';

comment on column public.evidence_snapshots.snapshot_hash is
  'SHA-256 fingerprint of canonical evidence content excluding capture time.';

comment on column public.evidence_snapshots.dedupe_bucket is
  'Server-generated five-minute deduplication window.';

commit;
