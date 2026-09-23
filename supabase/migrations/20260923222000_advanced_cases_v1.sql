begin;

-- ============================================================
-- AYZO ADVANCED CASES V1
-- ============================================================

create table public.investigation_cases (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name))
      between 1 and 160
    ),

  description text
    check (
      description is null
      or char_length(trim(description))
        between 1 and 5000
    ),

  status text not null default 'open'
    check (
      status in (
        'open',
        'closed'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint investigation_cases_id_user_key
    unique(id, user_id)
);

create index investigation_cases_user_updated_idx
  on public.investigation_cases(
    user_id,
    updated_at desc
  );

create index investigation_cases_user_status_idx
  on public.investigation_cases(
    user_id,
    status,
    updated_at desc
  );

create trigger investigation_cases_set_updated_at
before update on public.investigation_cases
for each row
execute function public.ayzo_set_updated_at();


-- Composite ownership target for case links.
alter table public.saved_analyses
add constraint saved_analyses_id_user_key
unique(id, user_id);


create table public.case_saved_analyses (
  case_id uuid not null,

  saved_analysis_id uuid not null,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key(
    case_id,
    saved_analysis_id
  ),

  constraint case_saved_analyses_case_owner_fk
    foreign key(
      case_id,
      user_id
    )
    references public.investigation_cases(
      id,
      user_id
    )
    on delete cascade,

  constraint case_saved_analyses_analysis_owner_fk
    foreign key(
      saved_analysis_id,
      user_id
    )
    references public.saved_analyses(
      id,
      user_id
    )
    on delete cascade
);

create index case_saved_analyses_user_case_idx
  on public.case_saved_analyses(
    user_id,
    case_id,
    created_at desc
  );


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.investigation_cases
enable row level security;

alter table public.case_saved_analyses
enable row level security;


create policy investigation_cases_select_own
on public.investigation_cases
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

create policy investigation_cases_insert_own
on public.investigation_cases
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

create policy investigation_cases_update_own
on public.investigation_cases
for update
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
)
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

create policy investigation_cases_delete_own
on public.investigation_cases
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


create policy case_saved_analyses_select_own
on public.case_saved_analyses
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

create policy case_saved_analyses_insert_own
on public.case_saved_analyses
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

create policy case_saved_analyses_delete_own
on public.case_saved_analyses
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


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all
on table public.investigation_cases
from anon;

revoke all
on table public.case_saved_analyses
from anon;

revoke all
on table public.investigation_cases
from authenticated;

revoke all
on table public.case_saved_analyses
from authenticated;

grant
  select,
  insert,
  update,
  delete
on table public.investigation_cases
to authenticated;

grant
  select,
  insert,
  delete
on table public.case_saved_analyses
to authenticated;


comment on table public.investigation_cases is
  'Advanced user-owned AYZO investigation cases.';

comment on table public.case_saved_analyses is
  'Ownership-safe links between AYZO investigation cases and existing saved analyses. Analysis payloads remain canonical in saved_analyses.';

commit;
