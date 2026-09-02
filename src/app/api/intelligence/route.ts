import { isAddress } from "@solana/kit";
import { cookies } from "next/headers";

import {
  consumeFreeAnalysis,
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";
import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";
import {
  runSolanaIntelligence,
} from "@/lib/intelligence/solana/engine";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import { readJsonObjectBody } from "@/lib/requestBody";

export async function POST(request: Request) {
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
          code: "RATE_LIMITED",
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

    const resolution =
      resolveIntelligenceNetwork(body.network);

    if (!resolution.ok) {
      return Response.json(
        {
          ok: false,
          code: resolution.code,
          error: resolution.error,
          network: resolution.networkId,
        },
        {
          status:
            resolution.code ===
            "NETWORK_NOT_AVAILABLE"
              ? 503
              : 400,
        }
      );
    }

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    if (!address) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Address is required.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "solana" &&
      !isAddress(address)
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Solana address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    const testFailure =
      process.env.NODE_ENV !== "production" &&
      (body.__testFailure === "relationships" ||
        body.__testFailure === "funding")
        ? body.__testFailure
        : null;

    if (!isDevelopmentTestRequest) {
      const quota =
        await consumeFreeAnalysis(request);

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
        const retryAfterSeconds =
          quota.resetAt
            ? Math.max(
                1,
                Math.ceil(
                  (quota.resetAt - Date.now()) /
                    1000
                )
              )
            : 24 * 60 * 60;

        return Response.json(
          {
            ok: false,
            code: "DAILY_FREE_LIMIT",
            error:
              "Daily free analysis limit reached.",
            plan: "free",
            quota: {
              limit: quota.limit,
              remaining: 0,
              resetAt: quota.resetAt,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                retryAfterSeconds
              ),
              "Cache-Control": "no-store",
            },
          }
        );
      }
    }

    switch (resolution.engine) {
      case "solana": {
        const result =
          await runSolanaIntelligence({
            address,
            requestUrl: request.url,
            testFailure,
          });

        return Response.json(
          result.data,
          { status: result.status }
        );
      }

      case "evm":
      case "bitcoin":
        return Response.json(
          {
            ok: false,
            code: "NETWORK_NOT_AVAILABLE",
            error:
              `${resolution.network.name} intelligence engine is not available yet.`,
            network: resolution.networkId,
          },
          { status: 503 }
        );
    }
  } catch {
    return Response.json(
      {
        ok: false,
        code: "UPSTREAM_ERROR",
        error: "AYZO Intelligence Pipeline failed.",
      },
      { status: 500 }
    );
  }
}
