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
  isValidDeviceToken,
} from "@/lib/account/deviceProtection";

import {
  isRevokedDeviceError,
  registerAccountDevice,
} from "@/lib/account/deviceProtectionServer";

import {
  deliverWelcomeEmailIfEligible,
} from "@/lib/account/welcomeEmail";

import {
  recordSignupSource,
} from "@/lib/account/signupSourceServer";

import {
  isInitialSignupSession,
} from "@/lib/account/signupSource";

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

  const existingDeviceToken =
    request.cookies
      .get(
        DEVICE_COOKIE_NAME
      )
      ?.value ??
    null;

  /*
   * A genuine authentication callback may arrive
   * with a legacy AYZO device cookie created before
   * strict 43-character base64url device tokens.
   *
   * Do not let that stale cookie permanently block
   * authentication. Generate a fresh device identity
   * only during this genuine authentication event.
   *
   * Valid revoked tokens still follow the existing
   * DEVICE_SESSION_REVOKED recovery path below.
   */
  let deviceToken =
    existingDeviceToken &&
    isValidDeviceToken(
      existingDeviceToken
    )
      ? existingDeviceToken
      : createDeviceToken();

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
          const {
            data:
              userData,
          } =
            await supabase.auth
              .getUser();

          const authUser =
            userData.user;

          if (
            authUser &&
            isInitialSignupSession({
              createdAt:
                authUser.created_at,

              lastSignInAt:
                authUser.last_sign_in_at ??
                null,
            })
          ) {
            await recordSignupSource({
              userId,
              channel:
                "web",

              userAgent:
                request.headers.get(
                  "user-agent"
                ),

              countryCode:
                request.headers.get(
                  "x-vercel-ip-country"
                ),
            });
          }
        } catch {
          /*
           * Signup-source analytics must
           * never break authentication.
           */
        }

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
