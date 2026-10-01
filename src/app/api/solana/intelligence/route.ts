import { isAddress } from "@solana/kit";
import { cookies } from "next/headers";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import {
  consumeAnalysisQuota,
  refundAnalysisQuota,
  refundAnalysisQuotaOnFailure,
} from "@/lib/analysisQuota";

import {
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";
import { readJsonObjectBody } from "@/lib/requestBody";
import { runSolanaIntelligence } from "@/lib/intelligence/solana/engine";

export async function POST(request: Request) {
  let quota:
    Awaited<
      ReturnType<
        typeof consumeAnalysisQuota
      >
    > | null = null;

  const isDevelopmentTestRequest =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-ayzo-test-request") === "smoke";

  if (!isDevelopmentTestRequest) {
    const clientIp = getClientIp(request);

    const rateLimit = await checkRateLimit({
      key: `intelligence:${clientIp}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        {
          ok: false,
          error: "Too many analysis requests.",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }
  }

  try {
    const parsedBody =
      await readJsonObjectBody(request);

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;

    const address =
      typeof body?.address === "string"
        ? body.address.trim()
        : "";

    const testFailure =
      process.env.NODE_ENV !== "production" &&
      (body?.__testFailure === "relationships" ||
        body?.__testFailure === "funding")
        ? body.__testFailure
        : null;

    if (!address) {
      return Response.json(
        {
          ok: false,
          error: "Token address is required.",
        },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return Response.json(
        {
          ok: false,
          error: "Invalid Solana address.",
        },
        { status: 400 }
      );
    }

    if (!isDevelopmentTestRequest) {
      quota =
        await consumeAnalysisQuota(
          request,
          "solana"
        );

      if (quota.deviceCookie) {
        const cookieStore = await cookies();

        cookieStore.set(
          FREE_DEVICE_COOKIE,
          quota.deviceCookie,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: FREE_DEVICE_COOKIE_MAX_AGE,
          }
        );
      }

      if (!quota.allowed) {
        const networkBlocked =
          quota.plan ===
            "free" &&
          quota.blockedBy ===
            "network";

        const resetAt =
          networkBlocked
            ? quota.networkResetAt ??
              quota.resetAt
            : quota.resetAt;

        const retryAfterSeconds =
          resetAt
            ? Math.max(
                1,
                Math.ceil(
                  (
                    resetAt -
                    Date.now()
                  ) /
                    1000
                )
              )
            : 24 * 60 * 60;

        return Response.json(
          {
            ok:
              false,

            code:
              networkBlocked
                ? "DAILY_NETWORK_LIMIT"
                : quota.plan ===
                    "advanced"
                  ? "DAILY_ADVANCED_LIMIT"
                  : quota.plan ===
                      "pro"
                    ? "DAILY_PRO_LIMIT"
                    : "DAILY_FREE_LIMIT",

            error:
              networkBlocked
                ? `AYZO Free allows a maximum of ${quota.networkLimit ?? 2} analyses on Solana within the current rolling 24-hour window. You can continue with another supported network.`
                : quota.plan ===
                    "advanced"
                  ? "Daily Advanced analysis limit reached."
                  : quota.plan ===
                      "pro"
                    ? "Daily Pro analysis limit reached."
                    : "Daily free analysis limit reached.",

            plan:
              quota.plan,

            network:
              "solana",

            quota: {
              limit:
                quota.limit,

              remaining:
                quota.remaining,

              resetAt:
                quota.resetAt,

              network:
                quota.network ??
                "solana",

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
          },
          {
            status:
              429,

            headers: {
              "Retry-After":
                String(
                  retryAfterSeconds
                ),

              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    }

    const result = await runSolanaIntelligence({
      address,
      requestUrl:
        request.url,
      analysisPlan:
        quota?.plan ??
        "free",
      testFailure,
    });

    await refundAnalysisQuotaOnFailure(
      request,
      quota,
      result.status
    );

    return Response.json(
      result.data,
      { status: result.status }
    );

  } catch {
    if (
      !isDevelopmentTestRequest &&
      quota
    ) {
      await refundAnalysisQuota(
        request,
        quota
      );
    }

    return Response.json(
      {
        ok: false,
        error: "AYZO Intelligence Pipeline failed.",
      },
      { status: 500 }
    );
  }
}
