import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  getMobileAnalysisQuotaStatus,
} from "@/lib/account/mobileAnalysisQuota";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: Request
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if (!auth.ok) {
    return Response.json(
      {
        ok: false,
        code:
          auth.code,
        error:
          auth.error,
      },
      {
        status:
          auth.status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const {
    entitlement,
    billingAvailable,
  } =
    await getMobileEntitlement(
      auth.identity.userId
    );

  const quota =
    await getMobileAnalysisQuotaStatus(
      auth.identity.userId,
      entitlement.planId
    );

  return Response.json(
    {
      ok: true,

      plan:
        entitlement.planId,

      billingAvailable,

      quota: {
        limit:
          quota.limit,

        remaining:
          quota.remaining,

        resetAt:
          quota.resetAt,
      },
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
