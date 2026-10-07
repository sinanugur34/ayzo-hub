import "server-only";

import {
  randomUUID,
} from "node:crypto";

import type {
  ProviderUsageContext,
  ProviderUsagePlatform,
  ProviderUsagePlan,
  ProviderUsageSummaryRow,
} from "@/lib/providerUsageTelemetryCore";

import {
  summarizeProviderUsage,
} from "@/lib/providerUsageTelemetryCore";

import {
  persistProviderUsageEvents,
} from "@/lib/providerUsageTelemetry";

import {
  runWithProviderUsageScope,
} from "@/lib/providerUsageScope";

export type RunProviderUsageAnalysisInput = {
  userId:
    string |
    null;

  platform:
    ProviderUsagePlatform;

  planId:
    ProviderUsagePlan;

  network:
    string;
};

export type ProviderUsageAnalysisResult<T> = {
  value:
    T;

  analysisId:
    string;

  providerUsage:
    readonly ProviderUsageSummaryRow[];
};

export async function runProviderUsageAnalysis<T>(
  input:
    RunProviderUsageAnalysisInput,

  callback:
    () =>
      Promise<T>
): Promise<
  ProviderUsageAnalysisResult<T>
> {
  const analysisId =
    randomUUID();

  const context:
    ProviderUsageContext = {
      analysisId,

      userId:
        input.userId,

      platform:
        input.platform,

      planId:
        input.planId,

      network:
        input.network,
    };

  const {
    value,
    events,
  } =
    await runWithProviderUsageScope(
      context,
      callback
    );

  /*
   * Persistence deliberately happens after
   * provider work has completed.
   *
   * The telemetry writer itself is fail-open.
   */
  await persistProviderUsageEvents(
    events
  );

  return {
    value,

    analysisId,

    providerUsage:
      summarizeProviderUsage(
        events
      ),
  };
}
