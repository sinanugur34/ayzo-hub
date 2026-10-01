import {
  cookies,
} from "next/headers";

import {
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";

import {
  getAnalysisQuotaStatus,
} from "@/lib/analysisQuota";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  PLANS,
} from "@/lib/plans/registry";

import {
  GUEST_ANALYSIS_POLICY,
} from "@/lib/guestAnalysisPolicy";

export const dynamic =
  "force-dynamic";

export async function GET(
  request:
    Request
) {
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

  const quota =
    await getAnalysisQuotaStatus(
      request,
      networkId
    );

  const authenticated =
    quota.userId !==
    null;

  const accessMode =
    authenticated
      ? "account"
      : "guest";

  if (
    quota.deviceCookie
  ) {
    const cookieStore =
      await cookies();

    cookieStore.set(
      FREE_DEVICE_COOKIE,
      quota.deviceCookie,
      {
        httpOnly:
          true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          FREE_DEVICE_COOKIE_MAX_AGE,
      }
    );
  }

  const freePlanQuota =
    PLANS.free
      .analysisQuota;

  return Response.json(
    {
      ok:
        true,

      authenticated,

      accessMode,

      plan:
        quota.plan,

      available:
        quota.available,

      limit:
        quota.limit,

      remaining:
        quota.remaining,

      resetAt:
        quota.resetAt,

      totalLimit:
        quota.limit,

      totalRemaining:
        quota.remaining,

      totalResetAt:
        quota.resetAt,

      network:
        authenticated
          ? quota.network ??
            networkId
          : null,

      networkLimit:
        authenticated &&
        quota.plan ===
          "free"
          ? quota.networkLimit ??
            (
              freePlanQuota.kind ===
                "fixed"
                ? freePlanQuota
                    .perNetworkCount
                : null
            )
          : null,

      networkRemaining:
        authenticated &&
        quota.plan ===
          "free"
          ? quota.networkRemaining ??
            null
          : null,

      networkResetAt:
        authenticated &&
        quota.plan ===
          "free"
          ? quota.networkResetAt ??
            null
          : null,

      /*
       * Explicit conversion contract for clients.
       * This is informational only; enforcement
       * remains server-side.
       */
      guestLimit:
        GUEST_ANALYSIS_POLICY.limit,

      freeAccountLimit:
        freePlanQuota.kind ===
          "fixed"
          ? freePlanQuota.count
          : null,

      freeAccountNetworkLimit:
        freePlanQuota.kind ===
          "fixed"
          ? freePlanQuota
              .perNetworkCount
          : null,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
