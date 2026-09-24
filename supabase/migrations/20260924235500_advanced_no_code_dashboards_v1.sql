begin;

-- AYZO Advanced No-Code Dashboards V1.
-- Dashboard records reference existing saved analyses.
-- Canonical analysis payloads remain in saved_analyses.

do $$
begin
  if to_regclass('public.no_code_dashboards') is not null
     or to_regclass('public.no_code_dashboard_widgets') is not null then
    raise exception
      'No-Code Dashboards tables already exist. Migration aborted.';
  end if;
end
$$;

create table public.no_code_dashboards (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name))
      between 1 and 120
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint no_code_dashboards_id_user_key
    unique(id, user_id)
);

create index no_code_dashboards_user_updated_idx
  on public.no_code_dashboards(
    user_id,
    updated_at desc
  );

create trigger no_code_dashboards_set_updated_at
before update on public.no_code_dashboards
for each row
execute function public.ayzo_set_updated_at();


create table public.no_code_dashboard_widgets (
  id uuid primary key default gen_random_uuid(),

  dashboard_id uuid not null,
  saved_analysis_id uuid not null,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  widget_kind text not null
    check (
      widget_kind in (
        'overview',
        'evidence',
        'findings'
      )
    ),

  position integer not null
    check (
      position between 0 and 11
    ),

  created_at timestamptz not null default now(),

  constraint no_code_dashboard_widgets_unique
    unique(
      dashboard_id,
      saved_analysis_id,
      widget_kind
    ),

  constraint no_code_dashboard_widgets_dashboard_owner_fk
    foreign key(
      dashboard_id,
      user_id
    )
    references public.no_code_dashboards(
      id,
      user_id
    )
    on delete cascade,

  constraint no_code_dashboard_widgets_analysis_owner_fk
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

create index no_code_dashboard_widgets_user_dashboard_idx
  on public.no_code_dashboard_widgets(
    user_id,
    dashboard_id,
    position
  );


alter table public.no_code_dashboards
enable row level security;

alter table public.no_code_dashboard_widgets
enable row level security;


create policy no_code_dashboards_select_advanced_own
on public.no_code_dashboards
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);

create policy no_code_dashboards_insert_advanced_own
on public.no_code_dashboards
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);

create policy no_code_dashboards_update_advanced_own
on public.no_code_dashboards
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
)
with check (
  user_id = auth.uid()
);

create policy no_code_dashboards_delete_advanced_own
on public.no_code_dashboards
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);


create policy no_code_dashboard_widgets_select_advanced_own
on public.no_code_dashboard_widgets
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);

create policy no_code_dashboard_widgets_insert_advanced_own
on public.no_code_dashboard_widgets
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);

create policy no_code_dashboard_widgets_delete_advanced_own
on public.no_code_dashboard_widgets
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.plan_id = 'advanced'
      and s.status in ('active', 'canceling')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
);


revoke all
on table public.no_code_dashboards
from anon, authenticated;

revoke all
on table public.no_code_dashboard_widgets
from anon, authenticated;

grant
  select,
  insert,
  update,
  delete
on table public.no_code_dashboards
to authenticated;

grant
  select,
  insert,
  delete
on table public.no_code_dashboard_widgets
to authenticated;


comment on table public.no_code_dashboards is
  'Advanced user-owned AYZO No-Code Dashboards.';

comment on table public.no_code_dashboard_widgets is
  'Ownership-safe references to canonical AYZO saved analyses.';

commit;
