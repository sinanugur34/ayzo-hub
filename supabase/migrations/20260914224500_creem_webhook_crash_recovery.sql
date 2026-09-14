-- AYZO Creem webhook crash recovery hardening.
--
-- Backward compatible:
-- - Adds a nullable processing claim timestamp.
-- - Backfills already-processing rows from received_at.
-- - Adds an index for stale processing recovery.
--
-- Existing processed/failed/ignored semantics remain unchanged.

alter table public.webhook_events
  add column if not exists processing_started_at timestamptz;

update public.webhook_events
set processing_started_at = received_at
where processing_status = 'processing'
  and processing_started_at is null;

create index if not exists webhook_events_processing_started_idx
  on public.webhook_events(processing_started_at)
  where processing_status = 'processing';

comment on column public.webhook_events.processing_started_at is
  'Server-only timestamp for atomic webhook processing claims and stale crash recovery.';
