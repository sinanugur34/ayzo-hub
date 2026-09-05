export const ALERT_SCHEDULER_MIN_INTERVAL_SECONDS =
  60 * 60;

export const ALERT_SCHEDULER_MAX_RUNS_PER_DAY =
  24;

export const ALERT_SCHEDULER_MAX_RULES_PER_RUN =
  2;

export const ALERT_SCHEDULER_MAX_RULE_EVALUATIONS_PER_DAY =
  ALERT_SCHEDULER_MAX_RUNS_PER_DAY *
  ALERT_SCHEDULER_MAX_RULES_PER_RUN;

export const ALERT_SCHEDULER_CADENCE_KEY_PREFIX =
  "ayzo:alerts:scheduler:cadence:v1";

function normalizeSegment(
  value: string | undefined,
  fallback: string
) {
  const normalized =
    value
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(
        0,
        80
      ) ?? "";

  return normalized || fallback;
}

export function buildAlertSchedulerCadenceKey(
  environment: string | undefined,
  branch: string | undefined
) {
  const environmentSegment =
    normalizeSegment(
      environment,
      "local"
    );

  if (
    environmentSegment ===
    "preview"
  ) {
    return [
      ALERT_SCHEDULER_CADENCE_KEY_PREFIX,
      "preview",
      normalizeSegment(
        branch,
        "unknown"
      ),
    ].join(":");
  }

  return [
    ALERT_SCHEDULER_CADENCE_KEY_PREFIX,
    environmentSegment,
  ].join(":");
}
