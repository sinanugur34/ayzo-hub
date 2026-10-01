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

  return Response.json(
    {
      ok:
        true,

      plan:
        quota.plan,

      available:
        quota.available,

      /*
       * Legacy field names stay for existing
       * clients. total* fields make the contract
       * explicit for new quota UI.
       */
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
        quota.network ??
        networkId,

      networkLimit:
        quota.plan ===
          "free"
          ? quota.networkLimit ??
            2
          : null,

      networkRemaining:
        quota.plan ===
          "free"
          ? quota.networkRemaining ??
            null
          : null,

      networkResetAt:
        quota.plan ===
          "free"
          ? quota.networkResetAt ??
            null
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
