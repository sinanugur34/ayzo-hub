import {
  NextResponse,
} from "next/server";

import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

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

type ExecuteRequestBody = {
  execute?: unknown;
};

export async function POST(
  request: Request
) {
  if (
    !isInternalApiRequest(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Forbidden.",
      },
      {
        status: 403,
      }
    );
  }

  let body:
    ExecuteRequestBody =
    {};

  try {
    const parsed:
      unknown =
      await request.json();

    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      body =
        parsed as
          ExecuteRequestBody;
    }
  } catch {
    body = {};
  }

  if (
    body.execute !==
    true
  ) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "EXECUTION_NOT_CONFIRMED",
        error:
          "Explicit execute=true required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
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
          "bounded-v1",
        skipped:
          true,
        skipReason:
          outcome.reason,
        lockAcquired:
          false,
        lockReleased:
          null,
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
        "bounded-v1",
      skipped:
        false,
      lockAcquired:
        true,
      lockReleased:
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
      AlertRunnerLockUnavailableError
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "ALERT_RUNNER_LOCK_UNAVAILABLE",
          error:
            "AYZO alert runner lock unavailable.",
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
          "ALERT_EVALUATION_FAILED",
        error:
          "AYZO alert evaluation failed.",
      },
      {
        status: 500,
      }
    );
  }
}
