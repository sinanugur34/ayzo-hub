import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  MAX_BATCH_ANALYSIS_TARGETS,
} from "@/lib/account/batchAnalysis";

import {
  canUseBatchAnalysis,
} from "@/lib/account/batchAnalysisAccess";

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
      await canUseBatchAnalysis(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "Batch Analysis requires AYZO Advanced.",

        code:
          "PLAN_REQUIRED",
      },
      403
    );
  }

  return noStoreJson({
    enabled:
      true,

    maxBatchSize:
      MAX_BATCH_ANALYSIS_TARGETS,

    execution:
      "sequential",

    quotaMode:
      "normal_analysis_quota",

    intelligenceEndpoint:
      "/api/intelligence",
  });
}
