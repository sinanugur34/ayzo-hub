import { isAddress } from "@solana/kit";
import { cookies } from "next/headers";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import {
  consumeFreeAnalysis,
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";
import { readJsonObjectBody } from "@/lib/requestBody";
import { runSolanaIntelligence } from "@/lib/intelligence/solana/engine";

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

    return await runSolanaIntelligence({
      address,
      requestUrl: request.url,
      testFailure,
    });

  } catch {
    return Response.json(
      {
        ok: false,
        error: "AYZO Intelligence Pipeline failed.",
      },
      { status: 500 }
    );
  }
}
