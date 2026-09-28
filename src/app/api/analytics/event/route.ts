import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

import {
  sanitizeProductEventPayload,
} from "@/lib/productAnalyticsCore";

import {
  recordProductEvent,
} from "@/lib/productAnalytics";

import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function json(
  body: unknown,
  status: number
) {
  return Response.json(
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

export async function POST(
  request: Request
) {
  const contentLength =
    Number(
      request.headers.get(
        "content-length"
      ) ??
      "0"
    );

  if (
    Number.isFinite(
      contentLength
    ) &&
    contentLength >
      4096
  ) {
    return json(
      {
        ok: false,
        error:
          "Request too large.",
      },
      413
    );
  }

  try {
    const rateLimit =
      await checkRateLimit({
        key:
          `product-event:${getClientIp(
            request
          )}`,

        limit:
          120,

        windowMs:
          60_000,
      });

    if (
      !rateLimit.allowed
    ) {
      return json(
        {
          ok: false,
          error:
            "Too many analytics events.",
        },
        429
      );
    }
  } catch {
    /*
     * Telemetry rate limiting is
     * fail-open so analytics can never
     * affect AYZO product availability.
     */
  }

  const raw =
    await request
      .json()
      .catch(
        () => null
      );

  const event =
    sanitizeProductEventPayload(
      raw
    );

  if (!event) {
    return json(
      {
        ok: false,
        error:
          "Invalid analytics event.",
      },
      400
    );
  }

  let userId:
    string |
    null =
      null;

  try {
    const supabase =
      await createClient();

    const {
      data,
    } =
      await supabase.auth
        .getClaims();

    userId =
      typeof data
        ?.claims
        ?.sub ===
        "string"
        ? data.claims.sub
        : null;
  } catch {
    /*
     * Anonymous analytics remains
     * valid. Authentication must not be
     * required for consented product
     * telemetry.
     */
  }

  await recordProductEvent({
    userId,

    sessionId:
      event.sessionId,

    eventName:
      event.eventName,

    properties:
      event.properties,
  });

  /*
   * Analytics storage fails open.
   * The client does not need storage
   * state and product behavior must
   * never depend on telemetry.
   */
  return json(
    {
      ok: true,
    },
    202
  );
}
