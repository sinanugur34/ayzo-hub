import {
  isRecord,
  readRequiredString,
} from "@/lib/account/validation";

export type DashboardWidgetKind =
  | "overview"
  | "evidence"
  | "findings";

export const MAX_DASHBOARDS =
  10;

export const MAX_DASHBOARD_WIDGETS =
  12;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDashboardUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    UUID.test(value)
  );
}

export function parseCreateDashboardInput(
  value: unknown
) {
  if (
    !isRecord(value) ||
    value.action !== "create_dashboard"
  ) {
    return null;
  }

  const name =
    readRequiredString(
      value.name,
      120
    );

  return name
    ? { name }
    : null;
}

export function parseAddWidgetInput(
  value: unknown
) {
  if (
    !isRecord(value) ||
    value.action !== "add_widget" ||
    !isDashboardUuid(
      value.dashboardId
    ) ||
    !isDashboardUuid(
      value.savedAnalysisId
    ) ||
    (
      value.widgetKind !== "overview" &&
      value.widgetKind !== "evidence" &&
      value.widgetKind !== "findings"
    )
  ) {
    return null;
  }

  return {
    dashboardId:
      value.dashboardId,

    savedAnalysisId:
      value.savedAnalysisId,

    widgetKind:
      value.widgetKind as
        DashboardWidgetKind,
  };
}

function moduleCount(
  value: unknown
) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value).length;
  }

  return 0;
}

export function buildDashboardSnapshot(
  payload: unknown
) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return {
      coverage: null,
      topLevelKeyCount: 0,
      moduleCount: 0,
      findingsCount: 0,
    };
  }

  const record =
    payload as Record<
      string,
      unknown
    >;

  return {
    coverage:
      typeof record.coverage ===
        "string"
        ? record.coverage
        : null,

    topLevelKeyCount:
      Object.keys(record).length,

    moduleCount:
      moduleCount(
        record.modules
      ),

    findingsCount:
      Array.isArray(
        record.findings
      )
        ? record.findings.length
        : 0,
  };
}
