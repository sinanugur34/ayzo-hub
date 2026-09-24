import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  canUseNoCodeDashboards,
} from "@/lib/account/noCodeDashboardsAccess";

import {
  buildDashboardSnapshot,
  isDashboardUuid,
  MAX_DASHBOARDS,
  MAX_DASHBOARD_WIDGETS,
  parseAddWidgetInput,
  parseCreateDashboardInput,
} from "@/lib/account/noCodeDashboards";

import {
  requestTooLarge,
} from "@/lib/account/validation";

export const dynamic =
  "force-dynamic";

function json(
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

async function authorize() {
  const context =
    await getAuthenticatedAccountContext();

  if (!context.userId) {
    return {
      context,
      response:
        json(
          {
            error:
              "Unauthorized",
          },
          401
        ),
    };
  }

  if (
    !(
      await canUseNoCodeDashboards(
        context.userId
      )
    )
  ) {
    return {
      context,
      response:
        json(
          {
            error:
              "No-Code Dashboards requires AYZO Advanced.",
            code:
              "PLAN_REQUIRED",
          },
          403
        ),
    };
  }

  return {
    context,
    response:
      null,
  };
}

export async function GET() {
  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const userId =
    context.userId!;

  const [
    dashboardsResult,
    widgetsResult,
    analysesResult,
  ] =
    await Promise.all([
      context.supabase
        .from(
          "no_code_dashboards"
        )
        .select(
          "id,name,created_at,updated_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          MAX_DASHBOARDS
        ),

      context.supabase
        .from(
          "no_code_dashboard_widgets"
        )
        .select(
          "id,dashboard_id,saved_analysis_id,widget_kind,position"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "position",
          {
            ascending:
              true,
          }
        )
        .limit(
          MAX_DASHBOARDS *
          MAX_DASHBOARD_WIDGETS
        ),

      context.supabase
        .from(
          "saved_analyses"
        )
        .select(
          "id,network,subject_type,subject_value,title,created_at"
        )
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
        .limit(100),
    ]);

  if (
    dashboardsResult.error ||
    widgetsResult.error ||
    analysesResult.error
  ) {
    return json(
      {
        error:
          "Unable to load dashboards.",
      },
      500
    );
  }

  const widgets =
    widgetsResult.data ??
    [];

  const analysisIds =
    Array.from(
      new Set(
        widgets.map(
          row =>
            row.saved_analysis_id
        )
      )
    );

  let payloads:
    any[] = [];

  if (analysisIds.length) {
    const result =
      await context.supabase
        .from(
          "saved_analyses"
        )
        .select(
          "id,network,subject_type,subject_value,title,created_at,analysis_payload"
        )
        .eq(
          "user_id",
          userId
        )
        .in(
          "id",
          analysisIds
        );

    if (result.error) {
      return json(
        {
          error:
            "Unable to load dashboard evidence.",
        },
        500
      );
    }

    payloads =
      result.data ??
      [];
  }

  const byId =
    new Map(
      payloads.map(
        row => [
          row.id,
          row,
        ]
      )
    );

  const byDashboard =
    new Map<
      string,
      unknown[]
    >();

  widgets.forEach(
    widget => {
      const analysis =
        byId.get(
          widget.saved_analysis_id
        );

      if (!analysis) {
        return;
      }

      const current =
        byDashboard.get(
          widget.dashboard_id
        ) ??
        [];

      current.push({
        id:
          widget.id,

        dashboardId:
          widget.dashboard_id,

        savedAnalysisId:
          widget.saved_analysis_id,

        widgetKind:
          widget.widget_kind,

        position:
          widget.position,

        subject: {
          network:
            analysis.network,
          type:
            analysis.subject_type,
          value:
            analysis.subject_value,
          title:
            analysis.title,
          createdAt:
            analysis.created_at,
        },

        snapshot:
          buildDashboardSnapshot(
            analysis.analysis_payload
          ),
      });

      byDashboard.set(
        widget.dashboard_id,
        current
      );
    }
  );

  return json({
    dashboards:
      (
        dashboardsResult.data ??
        []
      ).map(
        dashboard => ({
          ...dashboard,

          widgets:
            byDashboard.get(
              dashboard.id
            ) ??
            [],
        })
      ),

    availableAnalyses:
      analysesResult.data ??
      [],

    limits: {
      dashboards:
        MAX_DASHBOARDS,

      widgetsPerDashboard:
        MAX_DASHBOARD_WIDGETS,
    },
  });
}

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request,
      8_192
    )
  ) {
    return json(
      {
        error:
          "Request too large.",
      },
      413
    );
  }

  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const userId =
    context.userId!;

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const create =
    parseCreateDashboardInput(
      body
    );

  if (create) {
    const {
      count,
      error:
        countError,
    } =
      await context.supabase
        .from(
          "no_code_dashboards"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "user_id",
          userId
        );

    if (countError) {
      return json(
        {
          error:
            "Unable to validate dashboard limit.",
        },
        500
      );
    }

    if (
      (
        count ??
        0
      ) >=
      MAX_DASHBOARDS
    ) {
      return json(
        {
          error:
            `Dashboard limit reached (${MAX_DASHBOARDS}).`,
          code:
            "DASHBOARD_LIMIT",
        },
        409
      );
    }

    const {
      data,
      error,
    } =
      await context.supabase
        .from(
          "no_code_dashboards"
        )
        .insert({
          user_id:
            userId,
          name:
            create.name,
        })
        .select(
          "id,name,created_at,updated_at"
        )
        .single();

    if (error) {
      return json(
        {
          error:
            "Unable to create dashboard.",
        },
        500
      );
    }

    return json(
      {
        dashboard:
          data,
      },
      201
    );
  }

  const add =
    parseAddWidgetInput(
      body
    );

  if (!add) {
    return json(
      {
        error:
          "Invalid dashboard action.",
      },
      400
    );
  }

  const [
    dashboardResult,
    analysisResult,
    existingResult,
  ] =
    await Promise.all([
      context.supabase
        .from(
          "no_code_dashboards"
        )
        .select("id")
        .eq(
          "id",
          add.dashboardId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),

      context.supabase
        .from(
          "saved_analyses"
        )
        .select("id")
        .eq(
          "id",
          add.savedAnalysisId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),

      context.supabase
        .from(
          "no_code_dashboard_widgets"
        )
        .select(
          "id,position"
        )
        .eq(
          "dashboard_id",
          add.dashboardId
        )
        .eq(
          "user_id",
          userId
        ),
    ]);

  if (
    dashboardResult.error ||
    analysisResult.error ||
    existingResult.error
  ) {
    return json(
      {
        error:
          "Unable to validate dashboard widget.",
      },
      500
    );
  }

  if (
    !dashboardResult.data ||
    !analysisResult.data
  ) {
    return json(
      {
        error:
          "Dashboard or saved analysis not found.",
      },
      404
    );
  }

  const existing =
    existingResult.data ??
    [];

  if (
    existing.length >=
    MAX_DASHBOARD_WIDGETS
  ) {
    return json(
      {
        error:
          `Widget limit reached (${MAX_DASHBOARD_WIDGETS}).`,
        code:
          "WIDGET_LIMIT",
      },
      409
    );
  }

  const used =
    new Set(
      existing.map(
        row =>
          row.position
      )
    );

  const position =
    Array.from(
      {
        length:
          MAX_DASHBOARD_WIDGETS,
      },
      (
        _,
        index
      ) =>
        index
    ).find(
      index =>
        !used.has(index)
    );

  if (
    position ===
    undefined
  ) {
    return json(
      {
        error:
          "No dashboard position is available.",
      },
      409
    );
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "no_code_dashboard_widgets"
      )
      .insert({
        user_id:
          userId,

        dashboard_id:
          add.dashboardId,

        saved_analysis_id:
          add.savedAnalysisId,

        widget_kind:
          add.widgetKind,

        position,
      })
      .select(
        "id,dashboard_id,saved_analysis_id,widget_kind,position"
      )
      .single();

  if (error) {
    return json(
      {
        error:
          error.code ===
            "23505"
            ? "This widget is already on the dashboard."
            : "Unable to add dashboard widget.",
      },
      error.code ===
        "23505"
        ? 409
        : 500
    );
  }

  return json(
    {
      widget:
        data,
    },
    201
  );
}

export async function DELETE(
  request: Request
) {
  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const params =
    new URL(
      request.url
    ).searchParams;

  const type =
    params.get(
      "type"
    );

  const id =
    params.get(
      "id"
    );

  if (
    (
      type !== "dashboard" &&
      type !== "widget"
    ) ||
    !isDashboardUuid(id)
  ) {
    return json(
      {
        error:
          "Invalid delete request.",
      },
      400
    );
  }

  const table =
    type === "dashboard"
      ? "no_code_dashboards"
      : "no_code_dashboard_widgets";

  const {
    data,
    error,
  } =
    await context.supabase
      .from(table)
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        context.userId!
      )
      .select("id")
      .maybeSingle();

  if (error) {
    return json(
      {
        error:
          "Unable to delete dashboard item.",
      },
      500
    );
  }

  if (!data) {
    return json(
      {
        error:
          "Dashboard item not found.",
      },
      404
    );
  }

  return json({
    deleted:
      true,
  });
}
