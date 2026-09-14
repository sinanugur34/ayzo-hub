import type {
  AdvancedReportV1,
} from "./advancedReport";

export const DATA_EXPORT_SCHEMA_VERSION =
  1 as const;

export type DataExportFormat =
  | "json"
  | "csv";

export type DataExportV1 = {
  version:
    typeof DATA_EXPORT_SCHEMA_VERSION;

  format:
    DataExportFormat;

  filename:
    string;

  contentType:
    string;

  content:
    string;
};

function safeSegment(
  value:
    string,
  fallback:
    string,
  maxLength =
    48
) {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        maxLength
      )
      .replace(
        /-+$/g,
        ""
      );

  return normalized ||
    fallback;
}

function exportDate(
  generatedAt:
    string
) {
  const parsed =
    new Date(
      generatedAt
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Data export requires a valid report timestamp."
    );
  }

  return parsed
    .toISOString()
    .slice(
      0,
      10
    );
}

function filenameFor(
  report:
    AdvancedReportV1,
  format:
    DataExportFormat
) {
  const network =
    safeSegment(
      report.subject.network,
      "network"
    );

  const subjectType =
    safeSegment(
      report.subject.type,
      "subject"
    );

  const subject =
    safeSegment(
      report.subject.value,
      "analysis",
      32
    );

  return [
    "ayzo",
    network,
    subjectType,
    subject,
    exportDate(
      report.generatedAt
    ),
  ].join("-") +
    `.${format}`;
}

function jsonExport(
  report:
    AdvancedReportV1
): DataExportV1 {
  const payload = {
    schemaVersion:
      DATA_EXPORT_SCHEMA_VERSION,

    exportType:
      "ayzo-advanced-report",

    report,
  };

  return {
    version:
      DATA_EXPORT_SCHEMA_VERSION,

    format:
      "json",

    filename:
      filenameFor(
        report,
        "json"
      ),

    contentType:
      "application/json; charset=utf-8",

    content:
      `${JSON.stringify(
        payload,
        null,
        2
      )}\n`,
  };
}

function safeCsvText(
  value:
    string
) {
  if (
    /^[=+\-@]/.test(
      value
    )
  ) {
    return `'${value}`;
  }

  return value;
}

function csvCell(
  value:
    string | number | null
) {
  if (
    value ===
      null
  ) {
    return "";
  }

  const raw =
    typeof value ===
      "string"
      ? safeCsvText(
          value
        )
      : String(
          value
        );

  if (
    /[",\r\n]/.test(
      raw
    )
  ) {
    return `"${raw.replace(
      /"/g,
      '""'
    )}"`;
  }

  return raw;
}

type CsvRow = {
  section:
    string;

  key:
    string;

  label:
    string;

  value:
    string | number | null;

  status:
    string | null;

  category:
    string | null;

  severity:
    string | null;

  confidence:
    string | null;

  title:
    string | null;
};

function csvRows(
  report:
    AdvancedReportV1
): CsvRow[] {
  const rows:
    CsvRow[] = [];

  function push(
    row:
      CsvRow
  ) {
    rows.push(
      row
    );
  }

  push({
    section:
      "report",

    key:
      "generatedAt",

    label:
      "Generated at",

    value:
      report.generatedAt,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      report.title,
  });

  push({
    section:
      "subject",

    key:
      "network",

    label:
      "Network",

    value:
      report.subject.network,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      null,
  });

  push({
    section:
      "subject",

    key:
      "type",

    label:
      "Subject type",

    value:
      report.subject.type,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      null,
  });

  push({
    section:
      "subject",

    key:
      "value",

    label:
      "Subject value",

    value:
      report.subject.value,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      null,
  });

  push({
    section:
      "evidence",

    key:
      "capturedAt",

    label:
      "Evidence captured at",

    value:
      report.evidence.capturedAt,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      null,
  });

  push({
    section:
      "evidence",

    key:
      "coverage",

    label:
      "Coverage",

    value:
      report.evidence.coverage,

    status:
      null,

    category:
      null,

    severity:
      null,

    confidence:
      null,

    title:
      null,
  });

  report.executiveSummary.forEach(
    (
      line,
      index
    ) => {
      push({
        section:
          "executive-summary",

        key:
          `summary-${index + 1}`,

        label:
          "Executive summary",

        value:
          line,

        status:
          null,

        category:
          null,

        severity:
          null,

        confidence:
          null,

        title:
          null,
      });
    }
  );

  report.metrics.forEach(
    metric => {
      push({
        section:
          "metric",

        key:
          metric.key,

        label:
          metric.label,

        value:
          metric.value,

        status:
          null,

        category:
          null,

        severity:
          null,

        confidence:
          null,

        title:
          null,
      });
    }
  );

  report.modules.forEach(
    module => {
      push({
        section:
          "module",

        key:
          module.id,

        label:
          module.id,

        value:
          null,

        status:
          module.status,

        category:
          null,

        severity:
          null,

        confidence:
          null,

        title:
          null,
      });
    }
  );

  report.findings.forEach(
    (
      finding,
      index
    ) => {
      push({
        section:
          "finding",

        key:
          finding.id ??
          `finding-${index + 1}`,

        label:
          "Finding",

        value:
          null,

        status:
          null,

        category:
          finding.category,

        severity:
          finding.severity,

        confidence:
          finding.confidence,

        title:
          finding.title,
      });
    }
  );

  report.methodology.forEach(
    (
      line,
      index
    ) => {
      push({
        section:
          "methodology",

        key:
          `method-${index + 1}`,

        label:
          "Methodology",

        value:
          line,

        status:
          null,

        category:
          null,

        severity:
          null,

        confidence:
          null,

        title:
          null,
      });
    }
  );

  report.limitations.forEach(
    (
      line,
      index
    ) => {
      push({
        section:
          "limitation",

        key:
          `limitation-${index + 1}`,

        label:
          "Limitation",

        value:
          line,

        status:
          null,

        category:
          null,

        severity:
          null,

        confidence:
          null,

        title:
          null,
      });
    }
  );

  return rows;
}

function csvExport(
  report:
    AdvancedReportV1
): DataExportV1 {
  const headers = [
    "section",
    "key",
    "label",
    "value",
    "status",
    "category",
    "severity",
    "confidence",
    "title",
  ] as const;

  const body =
    csvRows(
      report
    )
      .map(
        row =>
          headers
            .map(
              header =>
                csvCell(
                  row[
                    header
                  ]
                )
            )
            .join(",")
      );

  return {
    version:
      DATA_EXPORT_SCHEMA_VERSION,

    format:
      "csv",

    filename:
      filenameFor(
        report,
        "csv"
      ),

    contentType:
      "text/csv; charset=utf-8",

    content:
      [
        headers.join(","),
        ...body,
      ].join("\n") +
      "\n",
  };
}

export function buildDataExport(
  report:
    AdvancedReportV1,
  format:
    DataExportFormat
): DataExportV1 {
  if (
    format ===
    "json"
  ) {
    return jsonExport(
      report
    );
  }

  if (
    format ===
    "csv"
  ) {
    return csvExport(
      report
    );
  }

  throw new Error(
    "Unsupported data export format."
  );
}
