import {
  createClient,
} from "@/lib/supabase/server";

export async function getAuthenticatedAccountContext() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    typeof data?.claims?.sub ===
      "string"
      ? data.claims.sub
      : null;

  const userEmail =
    typeof data?.claims?.email ===
      "string"
      ? data.claims.email
          .trim()
          .toLowerCase()
      : null;

  if (
    error ||
    !userId
  ) {
    return {
      supabase,

      userId:
        null,

      userEmail:
        null,
    };
  }

  return {
    supabase,
    userId,
    userEmail,
  };
}
