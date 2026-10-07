import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  ProviderUsageEvent,
} from "@/lib/providerUsageTelemetryCore";

const MAX_EVENTS_PER_ANALYSIS =
  500;

function databaseRow(
  event:
    ProviderUsageEvent
) {
  return {
    analysis_id:
      event.analysisId,

    user_id:
      event.userId,

    platform:
      event.platform,

    plan_id:
      event.planId,

    network:
      event.network,

    provider:
      event.provider,

    operation:
      event.operation,

    outcome:
      event.outcome,

    latency_ms:
      event.latencyMs,

    http_status:
      event.httpStatus,

    error_code:
      event.errorCode,

    attempt:
      event.attempt,

    fallback_used:
      event.fallbackUsed,

    cache_hit:
      event.cacheHit,

    estimated_units:
      event.estimatedUnits,

    metadata:
      event.metadata,
  };
}

export async function persistProviderUsageEvents(
  events:
    readonly ProviderUsageEvent[]
): Promise<void> {
  if (
    events.length ===
      0
  ) {
    return;
  }

  try {
    const bounded =
      events.slice(
        0,
        MAX_EVENTS_PER_ANALYSIS
      );

    const analysisId =
      bounded[0]
        ?.analysisId;

    if (!analysisId) {
      return;
    }

    /*
     * One analysis must never flush events
     * belonging to another analysis scope.
     */
    if (
      bounded.some(
        event =>
          event.analysisId !==
          analysisId
      )
    ) {
      console.error(
        "AYZO provider telemetry batch mixed analysis ids."
      );

      return;
    }

    const admin =
      createAdminClient();

    const {
      error,
    } =
      await admin
        .from(
          "provider_usage_events"
        )
        .insert(
          bounded.map(
            databaseRow
          )
        );

    if (error) {
      console.error(
        "AYZO provider telemetry insert failed.",
        error.message
      );
    }

    if (
      events.length >
      MAX_EVENTS_PER_ANALYSIS
    ) {
      console.error(
        "AYZO provider telemetry batch truncated.",
        {
          analysisId,
          observed:
            events.length,
          persisted:
            MAX_EVENTS_PER_ANALYSIS,
        }
      );
    }
  } catch (
    error
  ) {
    /*
     * Provider-cost observability is strictly
     * fail-open. It must not impact the product.
     */
    console.error(
      "AYZO provider telemetry unavailable.",
      error instanceof
        Error
        ? error.message
        : "unknown"
    );
  }
}
