import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  PRODUCT_EVENT_NAMES,
  type ProductEventName,
} from "@/lib/productAnalyticsCore";

export type FunnelMetric = {
  events:
    number;

  sessions:
    number;

  users:
    number;
};

export type FunnelWindow =
  Record<
    ProductEventName,
    FunnelMetric
  >;

type FunnelRpcRow = {
  event_name:
    string;

  event_count:
    number |
    string;

  session_count:
    number |
    string;

  user_count:
    number |
    string;
};

function numberValue(
  value:
    number |
    string
) {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? Math.max(
        0,
        parsed
      )
    : 0;
}

function emptyWindow():
  FunnelWindow {
  return Object.fromEntries(
    PRODUCT_EVENT_NAMES.map(
      name => [
        name,
        {
          events:
            0,

          sessions:
            0,

          users:
            0,
        },
      ]
    )
  ) as FunnelWindow;
}

function buildWindow(
  value: unknown
):
  FunnelWindow {
  const result =
    emptyWindow();

  if (
    !Array.isArray(
      value
    )
  ) {
    return result;
  }

  for (
    const item of
    value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const row =
      item as FunnelRpcRow;

    if (
      !PRODUCT_EVENT_NAMES
        .includes(
          row.event_name as
            ProductEventName
        )
    ) {
      continue;
    }

    result[
      row.event_name as
        ProductEventName
    ] = {
      events:
        numberValue(
          row.event_count
        ),

      sessions:
        numberValue(
          row.session_count
        ),

      users:
        numberValue(
          row.user_count
        ),
    };
  }

  return result;
}

export async function getAdminConversionFunnel() {
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
        "ayzo_admin_product_funnel",
        {
          p_since:
            since7d,
        }
      ),

      admin.rpc(
        "ayzo_admin_product_funnel",
        {
          p_since:
            since30d,
        }
      ),
    ]);

  if (
    seven.error ||
    thirty.error
  ) {
    /*
     * Migration/dependency failure must
     * not break the existing Admin
     * dashboard.
     */
    return {
      available:
        false,

      last7d:
        emptyWindow(),

      last30d:
        emptyWindow(),
    };
  }

  return {
    available:
      true,

    last7d:
      buildWindow(
        seven.data
      ),

    last30d:
      buildWindow(
        thirty.data
      ),
  };
}
