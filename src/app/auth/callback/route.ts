import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

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

  return NextResponse.redirect(
    new URL(
      next,
      request.url
    )
  );
}
