import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  checkGooglePlayPublisherAccess,
} from "@/lib/billing/googlePlayApi";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: Request
) {
  if (
    !isInternalApiRequest(
      request
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Forbidden.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    await checkGooglePlayPublisherAccess();

    return Response.json(
      {
        ok: true,
        wif: true,
        serviceAccountImpersonation:
          true,
        androidPublisherApi:
          true,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "GOOGLE_PLAY_HEALTH_FAILED";

    return Response.json(
      {
        ok: false,
        code,
        wif: false,
        serviceAccountImpersonation:
          false,
        androidPublisherApi:
          false,
      },
      {
        status: 503,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
