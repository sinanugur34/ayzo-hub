import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUsePriorityAnalysis,
} from "@/lib/account/priorityAnalysisAccess";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function GET() {
  const {
    userId,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return noStoreJson(
      {
        error:
          "Unauthorized",
      },
      401
    );
  }

  if (
    !(
      await canUsePriorityAnalysis(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "Priority Analysis requires AYZO Advanced.",

        code:
          "PLAN_REQUIRED",
      },
      403
    );
  }

  return noStoreJson({
    enabled:
      true,

    mode:
      "reserved_admission_capacity",

    dailyQuota:
      "unchanged",

    rateLimits:
      "unchanged",

    clientConcurrency:
      "unchanged",

    hardCapacityBypass:
      false,
  });
}
