import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  getMobileAnalysisQuotaStatus,
} from "@/lib/account/mobileAnalysisQuota";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request:
    Request
) {
  const auth =
    await authenticateMobileRequest(
      request
    );

  if (!auth.ok) {
    return Response.json(
      {
        ok:
          false,

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

  const requestedNetwork =
    new URL(
      request.url
    ).searchParams.get(
      "network"
    );

  let networkId:
    string | null =
      null;

  if (requestedNetwork) {
    const resolution =
      resolveIntelligenceNetwork(
        requestedNetwork
      );

    if (!resolution.ok) {
      return Response.json(
        {
          ok:
            false,

          code:
            resolution.code,

          error:
            resolution.error,
        },
        {
          status:
            resolution.code ===
              "NETWORK_NOT_AVAILABLE"
              ? 503
              : 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    networkId =
      resolution.networkId;
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
      entitlement.planId,
      networkId
    );

  return Response.json(
    {
      ok:
        true,

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

        network:
          quota.network,

        networkLimit:
          quota.networkLimit,

        networkRemaining:
          quota.networkRemaining,

        networkResetAt:
          quota.networkResetAt,
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
