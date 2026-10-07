begin;

create table if not exists public.provider_usage_events (
  id uuid primary key
    default gen_random_uuid(),

  analysis_id uuid not null,

  user_id uuid null,

  platform text not null,

  plan_id text not null,

  network text not null,

  provider text not null,

  operation text not null,

  outcome text not null,

  latency_ms integer null,

  http_status integer null,

  error_code text null,

  attempt integer not null
    default 1,

  fallback_used boolean not null
    default false,

  cache_hit boolean not null
    default false,

  estimated_units numeric(18,6) null,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  constraint provider_usage_platform_check
    check (
      platform in (
        'web',
        'android',
        'ios',
        'api',
        'internal'
      )
    ),

  constraint provider_usage_plan_check
    check (
      plan_id in (
        'free',
        'pro',
        'advanced'
      )
    ),

  constraint provider_usage_outcome_check
    check (
      outcome in (
        'success',
        'rate_limited',
        'timeout',
        'upstream_error',
        'validation_error',
        'unavailable',
        'cache_hit'
      )
    ),

  constraint provider_usage_latency_check
    check (
      latency_ms is null
      or latency_ms >= 0
    ),

  constraint provider_usage_http_status_check
    check (
      http_status is null
      or (
        http_status >= 100
        and http_status <= 599
      )
    ),

  constraint provider_usage_attempt_check
    check (
      attempt >= 1
      and attempt <= 20
    ),

  constraint provider_usage_estimated_units_check
    check (
      estimated_units is null
      or estimated_units >= 0
    ),

  constraint provider_usage_network_length_check
    check (
      char_length(network)
      between 1 and 64
    ),

  constraint provider_usage_provider_length_check
    check (
      char_length(provider)
      between 1 and 64
    ),

  constraint provider_usage_operation_length_check
    check (
      char_length(operation)
      between 1 and 120
    ),

  constraint provider_usage_error_code_length_check
    check (
      error_code is null
      or char_length(error_code) <= 120
    )
);

comment on table
  public.provider_usage_events
is
  'Server-only provider usage telemetry. Contains no analyzed address, token, wallet, transaction subject, API key, credential, request body, or raw provider response.';

comment on column
  public.provider_usage_events.analysis_id
is
  'Ephemeral identifier grouping provider calls belonging to one AYZO analysis.';

comment on column
  public.provider_usage_events.metadata
is
  'Strictly bounded operational metadata. Must never contain an analyzed subject, secret, request body, raw provider payload, email, IP address, or device identifier.';

create index if not exists
  provider_usage_events_created_at_idx
on public.provider_usage_events (
  created_at desc
);

create index if not exists
  provider_usage_events_analysis_id_idx
on public.provider_usage_events (
  analysis_id
);

create index if not exists
  provider_usage_events_provider_created_idx
on public.provider_usage_events (
  provider,
  created_at desc
);

create index if not exists
  provider_usage_events_plan_created_idx
on public.provider_usage_events (
  plan_id,
  created_at desc
);

create index if not exists
  provider_usage_events_network_created_idx
on public.provider_usage_events (
  network,
  created_at desc
);

create index if not exists
  provider_usage_events_provider_operation_idx
on public.provider_usage_events (
  provider,
  operation,
  created_at desc
);

alter table
  public.provider_usage_events
enable row level security;

alter table
  public.provider_usage_events
force row level security;

revoke all
on table
  public.provider_usage_events
from public;

revoke all
on table
  public.provider_usage_events
from anon;

revoke all
on table
  public.provider_usage_events
from authenticated;

grant select,
      insert,
      update,
      delete
on table
  public.provider_usage_events
to service_role;

commit;
