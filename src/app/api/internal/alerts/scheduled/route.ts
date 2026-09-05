import {
  NextResponse,
} from "next/server";

import {
  runAlertEvaluationBatch,
} from "@/lib/alerts/evaluationBatch";

import {
  AlertRunnerLockUnavailableError,
  createAlertRunnerLeaseProvider,
} from "@/lib/alerts/runnerLock";

import {
  runWithAlertRunnerLease,
} from "@/lib/alerts/runnerSafety";

import {
  isAlertSchedulerEnabled,
  isValidAlertCronAuthorization,
} from "@/lib/alerts/schedulerPolicy";

import {
  AlertSchedulerCadenceUnavailableError,
  claimAlertSchedulerCadence,
} from "@/lib/alerts/schedulerCadence";

import {
  ALERT_SCHEDULER_MAX_RULE_EVALUATIONS_PER_DAY,
  ALERT_SCHEDULER_MAX_RULES_PER_RUN,
  ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
} from "@/lib/alerts/schedulerCostPolicy";

export async function GET(
  request: Request
) {
  const cronSecret =
    process.env.CRON_SECRET
      ?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "ALERT_SCHEDULER_NOT_CONFIGURED",
        error:
          "AYZO alert scheduler is not configured.",
        schedulerLive:
          false,
        deliveryLive:
          false,
        userAnalysisQuotaConsumed:
          false,
      },
      {
        status: 503,
      }
    );
  }

  if (
    !isValidAlertCronAuthorization(
      request.headers.get(
        "authorization"
      ),
      cronSecret
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Forbidden.",
        schedulerLive:
          false,
      },
      {
        status: 401,
      }
    );
  }

  if (
    !isAlertSchedulerEnabled(
      process.env
        .AYZO_ALERT_SCHEDULER_ENABLED
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "ALERT_SCHEDULER_DISABLED",
        error:
          "AYZO alert scheduler execution is disabled.",
        schedulerLive:
          false,
        deliveryLive:
          false,
        userAnalysisQuotaConsumed:
          false,
      },
      {
        status: 503,
      }
    );
  }

  try {
    const cadenceClaimed =
      await claimAlertSchedulerCadence();

    if (!cadenceClaimed) {
      return NextResponse.json({
        ok: true,
        mode:
          "scheduled-bounded-v1",
        skipped:
          true,
        skipReason:
          "cadence_guard",
        cadenceClaimed:
          false,
        schedulerExecutionEnabled:
          true,
        schedulerLive:
          false,
        deliveryLive:
          false,
        userAnalysisQuotaConsumed:
          false,
        policy: {
          minimumIntervalSeconds:
            ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
          maxRulesPerRun:
            ALERT_SCHEDULER_MAX_RULES_PER_RUN,
          maxRuleEvaluationsPerDay:
            ALERT_SCHEDULER_MAX_RULE_EVALUATIONS_PER_DAY,
        },
      });
    }

    const outcome =
      await runWithAlertRunnerLease(
        createAlertRunnerLeaseProvider(),
        () =>
          runAlertEvaluationBatch()
      );

    if (
      outcome.status ===
      "skipped"
    ) {
      return NextResponse.json({
        ok: true,
        mode:
          "scheduled-bounded-v1",
        skipped:
          true,
        skipReason:
          outcome.reason,
        lockAcquired:
          false,
        lockReleased:
          null,
        schedulerExecutionEnabled:
          true,
        schedulerLive:
          false,
        deliveryLive:
          false,
        userAnalysisQuotaConsumed:
          false,
      });
    }

    if (
      !outcome.released
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "ALERT_RUNNER_LOCK_RELEASE_FAILED",
          error:
            "AYZO alert runner lock release failed.",
          schedulerExecutionEnabled:
            true,
          schedulerLive:
            false,
          deliveryLive:
            false,
          userAnalysisQuotaConsumed:
            false,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      mode:
        "scheduled-bounded-v1",
      skipped:
        false,
      lockAcquired:
        true,
      lockReleased:
        true,
      schedulerExecutionEnabled:
        true,
      schedulerLive:
        false,
      deliveryLive:
        false,
      userAnalysisQuotaConsumed:
        false,
      summary:
        outcome.value,
    });
  } catch (error) {
    if (
      error instanceof
      AlertSchedulerCadenceUnavailableError
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "ALERT_SCHEDULER_CADENCE_UNAVAILABLE",
          error:
            "AYZO alert scheduler cadence guard unavailable.",
          schedulerExecutionEnabled:
            true,
          schedulerLive:
            false,
          deliveryLive:
            false,
          userAnalysisQuotaConsumed:
            false,
        },
        {
          status: 503,
        }
      );
    }

    if (
      error instanceof
      AlertRunnerLockUnavailableError
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "ALERT_RUNNER_LOCK_UNAVAILABLE",
          error:
            "AYZO alert runner lock unavailable.",
          schedulerExecutionEnabled:
            true,
          schedulerLive:
            false,
          deliveryLive:
            false,
          userAnalysisQuotaConsumed:
            false,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code:
          "ALERT_SCHEDULED_EVALUATION_FAILED",
        error:
          "AYZO scheduled alert evaluation failed.",
        schedulerExecutionEnabled:
          true,
        schedulerLive:
          false,
        deliveryLive:
          false,
        userAnalysisQuotaConsumed:
          false,
      },
      {
        status: 500,
      }
    );
  }
}
