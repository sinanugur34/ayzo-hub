begin;

create table public.evidence_locker_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  source_saved_analysis_id uuid not null,

  snapshot jsonb not null,

  snapshot_sha256 text not null
    check (
      snapshot_sha256 ~ '^[0-9a-f]{64}$'
    ),

  locked_at timestamptz not null default now(),

  constraint evidence_locker_items_user_source_key
    unique(user_id, source_saved_analysis_id)
);

create index evidence_locker_items_user_locked_idx
  on public.evidence_locker_items(
    user_id,
    locked_at desc
  );

alter table public.evidence_locker_items
enable row level security;

create policy evidence_locker_items_select_own
on public.evidence_locker_items
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions as subscription
    where subscription.user_id = auth.uid()
      and subscription.plan_id = 'advanced'
      and subscription.status in (
        'active',
        'canceling'
      )
      and subscription.current_period_end is not null
      and subscription.current_period_end > now()
  )
);

create policy evidence_locker_items_insert_own
on public.evidence_locker_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions as subscription
    where subscription.user_id = auth.uid()
      and subscription.plan_id = 'advanced'
      and subscription.status in (
        'active',
        'canceling'
      )
      and subscription.current_period_end is not null
      and subscription.current_period_end > now()
  )
);

create policy evidence_locker_items_delete_own
on public.evidence_locker_items
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions as subscription
    where subscription.user_id = auth.uid()
      and subscription.plan_id = 'advanced'
      and subscription.status in (
        'active',
        'canceling'
      )
      and subscription.current_period_end is not null
      and subscription.current_period_end > now()
  )
);

revoke all
on table public.evidence_locker_items
from anon;

revoke all
on table public.evidence_locker_items
from authenticated;

grant
  select,
  insert,
  delete
on table public.evidence_locker_items
to authenticated;

comment on table public.evidence_locker_items is
  'Advanced immutable evidence snapshots captured from user-owned saved analyses.';

commit;
