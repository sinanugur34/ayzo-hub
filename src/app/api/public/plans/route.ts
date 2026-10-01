import {
  NextResponse,
} from "next/server";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import {
  PLANS,
} from "@/lib/plans/registry";

import {
  GUEST_ANALYSIS_POLICY,
} from "@/lib/guestAnalysisPolicy";

const liveNetworkCount =
  Object.values(
    NETWORKS
  ).filter(
    network =>
      network.status ===
      "live"
  ).length;

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Methods":
    "GET, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type",
};

export async function GET() {
  return NextResponse.json(
    {
      version:
        1,

      source:
        "AYZO Pricing & Access",

      liveNetworkCount,

      guestAccess: {
        accountRequired:
          false,

        analysisQuota: {
          period:
            GUEST_ANALYSIS_POLICY.period,

          count:
            GUEST_ANALYSIS_POLICY.limit,
        },

        freeAccountUpgrade: {
          plan:
            "free",

          count:
            PLANS.free.analysisQuota.kind ===
              "fixed"
              ? PLANS.free
                  .analysisQuota
                  .count
              : null,

          perNetworkCount:
            PLANS.free.analysisQuota.kind ===
              "fixed"
              ? PLANS.free
                  .analysisQuota
                  .perNetworkCount
              : null,
        },
      },

      plans:
        PLANS,
    },
    {
      status:
        200,

      headers: {
        ...corsHeaders,

        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(
    null,
    {
      status:
        204,

      headers: {
        ...corsHeaders,

        "Access-Control-Max-Age":
          "86400",
      },
    }
  );
}
