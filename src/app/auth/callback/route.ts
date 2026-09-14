import {
  after,
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createDeviceToken,
  DEVICE_COOKIE_NAME,
} from "@/lib/account/deviceProtection";

import {
  isRevokedDeviceError,
  registerAccountDevice,
} from "@/lib/account/deviceProtectionServer";

import {
  deliverWelcomeEmailIfEligible,
} from "@/lib/account/welcomeEmail";

function safeNext(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/account";
  }

  return value;
}

function setDeviceCookie(
  response:
    NextResponse,
  deviceToken:
    string
) {
  response.cookies.set(
    DEVICE_COOKIE_NAME,
    deviceToken,
    {
      httpOnly:
        true,

      secure:
        process.env
          .NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      maxAge:
        60 *
        60 *
        24 *
        365,
    }
  );
}

export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl
      .searchParams
      .get("code");

  const next =
    safeNext(
      request.nextUrl
        .searchParams
        .get("next")
    );

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        request.url
      )
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code
      );

  if (error) {
    return NextResponse.redirect(
      new URL(
        "/login?error=auth_callback",
        request.url
      )
    );
  }

  const {
    data:
      claimsData,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    typeof claimsData
      ?.claims
      ?.sub ===
      "string"
      ? claimsData
          .claims
          .sub
      : null;

  let deviceToken =
    request.cookies
      .get(
        DEVICE_COOKIE_NAME
      )
      ?.value ??
    createDeviceToken();

  if (userId) {
    try {
      await registerAccountDevice({
        userId,
        deviceToken,
      });
    } catch (deviceError) {
      /*
       * A device that was removed because
       * a third device logged in must not
       * silently reactivate its old token.
       *
       * A genuine new authentication event
       * may receive a fresh device identity.
       */
      if (
        isRevokedDeviceError(
          deviceError
        )
      ) {
        deviceToken =
          createDeviceToken();

        try {
          await registerAccountDevice({
            userId,
            deviceToken,
          });
        } catch {
          await supabase.auth
            .signOut({
              scope:
                "local",
            });

          return NextResponse.redirect(
            new URL(
              "/login?error=device_registration",
              request.url
            )
          );
        }
      } else {
        await supabase.auth
          .signOut({
            scope:
              "local",
          });

        return NextResponse.redirect(
          new URL(
            "/login?error=device_registration",
            request.url
          )
        );
      }
    }

    after(
      async () => {
        try {
          await deliverWelcomeEmailIfEligible(
            userId
          );
        } catch {
          /*
           * Welcome-email delivery must
           * never break authentication.
           */
        }
      }
    );
  }

  const response =
    NextResponse.redirect(
      new URL(
        next,
        request.url
      )
    );

  setDeviceCookie(
    response,
    deviceToken
  );

  return response;
}
