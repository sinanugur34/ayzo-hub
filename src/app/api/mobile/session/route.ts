import {
  registerMobileSession,
  validateMobileSession,
} from "@/lib/account/mobileSessionAuth";

import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

async function enforceRateLimit(
  request: Request
) {
  const clientIp =
    getClientIp(
      request
    );

  const result =
    await checkRateLimit({
      key:
        `mobile-session:${clientIp}`,
      limit:
        20,
      windowMs:
        60_000,
    });

  if (
    result.allowed
  ) {
    return null;
  }

  return Response.json(
    {
      ok: false,
      code:
        "RATE_LIMITED",
      error:
        "Too many mobile session requests.",
      retryAfterSeconds:
        result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After":
          String(
            result.retryAfterSeconds
          ),

        "Cache-Control":
          "no-store",
      },
    }
  );
}

function jsonResult(
  result:
    Awaited<
      ReturnType<
        typeof registerMobileSession
      >
    > |
    Awaited<
      ReturnType<
        typeof validateMobileSession
      >
    >
) {
  const {
    status,
    ...body
  } =
    result;

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

/*
 * POST is allowed only immediately
 * after a fresh Supabase sign-in.
 *
 * It is the genuine-authentication
 * device-registration path.
 */
export async function POST(
  request: Request
) {
  const limited =
    await enforceRateLimit(
      request
    );

  if (limited) {
    return limited;
  }

  const result =
    await registerMobileSession(
      request
    );

  return jsonResult(
    result
  );
}

/*
 * GET never registers a new device.
 *
 * It only validates/touches a device
 * which is already in AYZO's ledger.
 * Unknown or revoked devices fail closed.
 */
export async function GET(
  request: Request
) {
  const limited =
    await enforceRateLimit(
      request
    );

  if (limited) {
    return limited;
  }

  const result =
    await validateMobileSession(
      request
    );

  return jsonResult(
    result
  );
}
