import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createDeviceToken,
  DEVICE_COOKIE_NAME,
} from "@/lib/account/deviceProtection";

export async function updateSession(
  request: NextRequest
) {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !publishableKey
  ) {
    throw new Error(
      "Supabase auth environment is not configured."
    );
  }

  let deviceToken =
    request.cookies
      .get(
        DEVICE_COOKIE_NAME
      )
      ?.value;

  if (!deviceToken) {
    deviceToken =
      createDeviceToken();

    request.cookies.set(
      DEVICE_COOKIE_NAME,
      deviceToken
    );
  }

  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      url,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  /*
   * Validates / refreshes the current
   * authentication token.
   *
   * Authorization must rely on
   * validated authentication claims.
   */
  await supabase.auth.getClaims();

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

  return response;
}
