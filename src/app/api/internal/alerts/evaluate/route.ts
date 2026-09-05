import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  runAlertEvaluationBatch,
} from "@/lib/alerts/evaluationBatch";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";


export const dynamic =
  "force-dynamic";


export async function POST(
  request:
    Request
) {
  if (
    !isInternalApiRequest(
      request
    )
  ) {
    return Response.json(
      {
        ok:
          false,

        error:
          "Forbidden.",
      },
      {
        status:
          403,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const parsed =
    await readJsonObjectBody(
      request
    );

  if (!parsed.ok) {
    return parsed.response;
  }

  /*
   * Prevent accidental execution during
   * endpoint/security probing.
   */
  if (
    parsed.body.execute !==
    true
  ) {
    return Response.json(
      {
        ok:
          false,

        code:
          "EXECUTION_NOT_CONFIRMED",

        error:
          "Bounded evaluation requires execute=true.",
      },
      {
        status:
          400,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const summary =
      await runAlertEvaluationBatch();

    return Response.json(
      {
        ok:
          true,

        mode:
          "bounded-v1",

        schedulerLive:
          false,

        deliveryLive:
          false,

        userAnalysisQuotaConsumed:
          false,

        summary,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch {
    return Response.json(
      {
        ok:
          false,

        code:
          "ALERT_EVALUATION_FAILED",

        error:
          "AYZO alert evaluation failed.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
