import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  buildAdminAuthenticatedAttribution,
  type AdminAttributionRow,
} from "@/lib/adminAttributionCore";

function emptyAttribution() {
  return buildAdminAuthenticatedAttribution(
    []
  );
}

export async function getAdminAuthenticatedAttribution() {
  const admin =
    createAdminClient();

  const now =
    Date.now();

  const since7d =
    new Date(
      now -
      7 *
      24 *
      60 *
      60 *
      1000
    ).toISOString();

  const since30d =
    new Date(
      now -
      30 *
      24 *
      60 *
      60 *
      1000
    ).toISOString();

  const [
    seven,
    thirty,
  ] =
    await Promise.all([
      admin.rpc(
        "ayzo_admin_authenticated_attribution",
        {
          p_since:
            since7d,
        }
      ),

      admin.rpc(
        "ayzo_admin_authenticated_attribution",
        {
          p_since:
            since30d,
        }
      ),
    ]);

  if (
    seven.error ||
    thirty.error ||
    !Array.isArray(
      seven.data
    ) ||
    !Array.isArray(
      thirty.data
    )
  ) {
    /*
     * Attribution analytics must never
     * break the Admin dashboard while a
     * migration is unavailable or while
     * telemetry is degraded.
     */
    return {
      available:
        false,

      last7d:
        emptyAttribution(),

      last30d:
        emptyAttribution(),
    };
  }

  return {
    available:
      true,

    last7d:
      buildAdminAuthenticatedAttribution(
        seven.data as
          AdminAttributionRow[]
      ),

    last30d:
      buildAdminAuthenticatedAttribution(
        thirty.data as
          AdminAttributionRow[]
      ),
  };
}
