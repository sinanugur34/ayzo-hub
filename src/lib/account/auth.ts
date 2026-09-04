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

  if (
    error ||
    !userId
  ) {
    return {
      supabase,
      userId:
        null,
    };
  }

  return {
    supabase,
    userId,
  };
}
