import { createHmac, createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientIp } from "@/lib/rateLimit";
import { getInternalApiKey } from "@/lib/apiSecurity";
import { readJsonObjectBody } from "@/lib/requestBody";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ayzo:waitlist:rate",
});

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashIp(ip: string) {
  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(ip)
    .digest("hex");
}

function hashEmail(email: string) {
  return createHash("sha256")
    .update(email)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const parsedBody =
      await readJsonObjectBody(request);

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const honeypot =
      typeof body?.website === "string"
        ? body.website.trim()
        : "";

    const source =
      body?.source === "free-limit"
        ? "free-limit"
        : body?.source ===
            "advanced-card"
          ? "advanced-card"
          : "pro-card";

    const waitlistName =
      source === "advanced-card"
        ? "AYZO Advanced"
        : source === "pro-card"
          ? "AYZO Pro"
          : "AYZO";

    // Silently accept obvious bot submissions.
    if (honeypot) {
      return Response.json({
        ok: true,
        message:
          `You're on the ${waitlistName} waitlist.`,
      });
    }

    if (
      !email ||
      email.length > 254 ||
      !EMAIL_PATTERN.test(email)
    ) {
      return Response.json(
        {
          ok: false,
          error: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    const limitResult = await ratelimit.limit(
      hashIp(ip)
    );

    if (!limitResult.success) {
      return Response.json(
        {
          ok: false,
          error:
            "Too many waitlist attempts. Try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                1,
                Math.ceil(
                  (limitResult.reset - Date.now()) /
                    1000
                )
              )
            ),
          },
        }
      );
    }

    const emailHash = hashEmail(email);

    const entryKey =
      `ayzo:waitlist:entry:${emailHash}`;

    const entry = {
      email,
      source,
      createdAt: new Date().toISOString(),
      consent:
        "ayzo-paid-plans-launch-and-early-access",
      consentVersion: "2026-09-04",
    };

    const created = await redis.set(
      entryKey,
      JSON.stringify(entry),
      {
        nx: true,
      }
    );

    if (created) {
      await redis.sadd(
        "ayzo:waitlist:index",
        emailHash
      );

      await redis.incr(
        "ayzo:waitlist:total"
      );
    }

    // Same response for new and duplicate emails.
    return Response.json({
      ok: true,
      message:
        `You're on the ${waitlistName} waitlist.`,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Waitlist signup is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
