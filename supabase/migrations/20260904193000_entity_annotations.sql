begin;

-- ============================================================
-- AYZO USER ENTITY ANNOTATIONS
--
-- Personal labels and notes attached to a wallet/token/entity.
-- These are USER assertions, never AYZO verified entity labels.
-- ============================================================

do $$
begin
  if to_regclass('public.entity_annotations') is not null then
    raise exception
      'public.entity_annotations already exists. Migration aborted.';
  end if;
end
$$;


create table public.entity_annotations (
  id uuid primary key default gen_random_uuid(),

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

  label text
    check (
      label is null
      or char_length(trim(label))
        between 1 and 80
    ),

  notes text
    check (
      notes is null
      or char_length(trim(notes))
        between 1 and 5000
    ),

  color_key text not null
    default 'violet'
    check (
      color_key in (
        'violet',
        'blue',
        'emerald',
        'amber',
        'rose',
        'zinc'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    label is not null
    or notes is not null
  ),

  unique (
    user_id,
    network,
    subject_type,
    subject_value
  )
);


create index entity_annotations_user_updated_idx
  on public.entity_annotations(
    user_id,
    updated_at desc
  );

create index entity_annotations_subject_idx
  on public.entity_annotations(
    user_id,
    network,
    subject_type,
    subject_value
  );


create trigger entity_annotations_set_updated_at
before update on public.entity_annotations
for each row
execute function public.ayzo_set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.entity_annotations
enable row level security;


create policy entity_annotations_select_own
on public.entity_annotations
for select
to authenticated
using (
  user_id = auth.uid()
);


create policy entity_annotations_insert_own
on public.entity_annotations
for insert
to authenticated
with check (
  user_id = auth.uid()
);


create policy entity_annotations_update_own
on public.entity_annotations
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


create policy entity_annotations_delete_own
on public.entity_annotations
for delete
to authenticated
using (
  user_id = auth.uid()
);


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all
on table public.entity_annotations
from anon;

revoke all
on table public.entity_annotations
from authenticated;

grant
  select,
  insert,
  update,
  delete
on table public.entity_annotations
to authenticated;


comment on table public.entity_annotations is
  'Authenticated user-owned labels and notes for AYZO subjects. These annotations are personal user assertions and are not AYZO verified entity labels.';

commit;
