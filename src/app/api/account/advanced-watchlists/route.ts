import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseAdvancedWatchlists,
} from "@/lib/account/advancedWatchlistsAccess";

import {
  buildAdvancedWatchlistOverview,
  type AdvancedWatchlist,
} from "@/lib/account/advancedWatchlists";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
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

export async function GET() {
  const {
    supabase,
    userId,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return noStoreJson(
      {
        error:
          "Unauthorized",
      },
      401
    );
  }

  if (
    !(
      await canUseAdvancedWatchlists(
        userId
      )
    )
  ) {
    return noStoreJson(
      {
        error:
          "Advanced Watchlists requires AYZO Advanced.",
        code:
          "PLAN_REQUIRED",
      },
      403
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "watchlists"
      )
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        watchlist_items (
          id,
          network,
          subject_type,
          subject_value,
          label,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(50);

  if (error) {
    return noStoreJson(
      {
        error:
          "Unable to load Advanced Watchlists.",
      },
      500
    );
  }

  const watchlists:
    AdvancedWatchlist[] =
      (data ?? []).map(
        row => ({
          id:
            row.id,

          name:
            row.name,

          description:
            row.description,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,

          items:
            (
              row.watchlist_items ??
              []
            ).map(
              item => ({
                id:
                  item.id,

                network:
                  item.network,

                subjectType:
                  item.subject_type,

                subjectValue:
                  item.subject_value,

                label:
                  item.label,

                notes:
                  item.notes,

                createdAt:
                  item.created_at,

                updatedAt:
                  item.updated_at,
              })
            ),
        })
      );

  return noStoreJson({
    overview:
      buildAdvancedWatchlistOverview(
        watchlists
      ),

    watchlists,
  });
}
