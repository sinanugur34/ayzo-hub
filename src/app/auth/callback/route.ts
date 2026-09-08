import {
  after,
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

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

  if (userId) {
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

  return NextResponse.redirect(
    new URL(
      next,
      request.url
    )
  );
}
