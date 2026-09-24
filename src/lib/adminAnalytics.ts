import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type AnalysisActivityPlatform =
  | "web"
  | "android"
  | "ios"
  | "api";

export type AnalysisActivityOutcome =
  | "completed"
  | "failed"
  | "quota_blocked";

export type AnalysisActivityPlan =
  | "free"
  | "pro"
  | "advanced";

export type RecordAnalysisActivityInput = {
  userId:
    string |
    null;

  platform:
    AnalysisActivityPlatform;

  network:
    string;

  planId:
    AnalysisActivityPlan;

  outcome:
    AnalysisActivityOutcome;

  httpStatus?:
    number |
    null;

  failureCode?:
    string |
    null;

  quotaLimit?:
    number |
    null;

  quotaRemaining?:
    number |
    null;

  quotaResetAt?:
    number |
    null;
};

function boundedRequiredString(
  value: string,
  maxLength: number
) {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Analytics value must not be empty."
    );
  }

  return normalized.slice(
    0,
    maxLength
  );
}

function boundedOptionalString(
  value:
    string |
    null |
    undefined,
  maxLength: number
) {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized.slice(
        0,
        maxLength
      )
    : null;
}

function quotaResetIso(
  value:
    number |
    null |
    undefined
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return new Date(
    value
  ).toISOString();
}

export async function recordAnalysisActivity(
  input:
    RecordAnalysisActivityInput
): Promise<void> {
  try {
    const admin =
      createAdminClient();

    const {
      error,
    } =
      await admin
        .from(
          "analysis_activity"
        )
        .insert({
          user_id:
            input.userId,

          platform:
            input.platform,

          network:
            boundedRequiredString(
              input.network,
              64
            ),

          plan_id:
            input.planId,

          outcome:
            input.outcome,

          http_status:
            input.httpStatus ??
            null,

          failure_code:
            boundedOptionalString(
              input.failureCode,
              120
            ),

          quota_limit:
            input.quotaLimit ??
            null,

          quota_remaining:
            input.quotaRemaining ??
            null,

          quota_reset_at:
            quotaResetIso(
              input.quotaResetAt
            ),
        });

    if (error) {
      console.error(
        "AYZO analysis activity insert failed.",
        error.message
      );
    }
  } catch (error) {
    /*
     * Operational analytics must never
     * interrupt the analysis product.
     */
    console.error(
      "AYZO analysis activity unavailable.",
      error instanceof Error
        ? error.message
        : "unknown"
    );
  }
}

const SAFE_FAILURE_CODE =
  /^[A-Z0-9][A-Z0-9_:-]{0,119}$/;

export function readAnalysisFailureCode(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const code =
    (
      value as Record<
        string,
        unknown
      >
    ).code;

  if (
    typeof code !== "string"
  ) {
    return null;
  }

  const normalized =
    code.trim();

  return SAFE_FAILURE_CODE.test(
    normalized
  )
    ? normalized
    : null;
}
