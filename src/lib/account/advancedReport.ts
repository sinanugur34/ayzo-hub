import type {
  HistoricalSnapshotV1,
} from "./historicalSnapshot";

export const ADVANCED_REPORT_SCHEMA_VERSION =
  1 as const;

export type AdvancedReportMetric = {
  key: string;
  label: string;
  value:
    | string
    | number;
};

export type AdvancedReportModule = {
  id: string;
  status: string;
};

export type AdvancedReportFinding = {
  id:
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

export type AdvancedReportV1 = {
  version:
    typeof ADVANCED_REPORT_SCHEMA_VERSION;

  reportType:
    "advanced-analysis";

  generatedAt:
    string;

  title:
    string;

  subject: {
    network:
      string;

    type:
      string;

    value:
      string;

    snapshotKind:
      string | null;
  };

  evidence: {
    capturedAt:
      string;

    coverage:
      string | null;

    metricCount:
      number;

    moduleCount:
      number;

    findingCount:
      number;
  };

  executiveSummary:
    readonly string[];

  metrics:
    readonly AdvancedReportMetric[];

  modules:
    readonly AdvancedReportModule[];

  findings:
    readonly AdvancedReportFinding[];

  methodology:
    readonly string[];

  limitations:
    readonly string[];
};

export type BuildAdvancedReportInput = {
  title:
    string;

  subjectType:
    string;

  subjectValue:
    string;

  snapshot:
    HistoricalSnapshotV1;

  generatedAt?:
    string;
};

const METRIC_LABELS:
  Readonly<
    Record<
      string,
      string
    >
  > = {
    holderTop1:
      "Top 1 holder concentration",

    holderTop5:
      "Top 5 holder concentration",

    holderTop10:
      "Top 10 holder concentration",

    holderTop20:
      "Top 20 holder concentration",

    tokenAccountsAnalyzed:
      "Token accounts analyzed",

    uniqueOwners:
      "Unique owners",

    tokenSupplyRaw:
      "Token supply (raw)",

    tokenDecimals:
      "Token decimals",

    tokenProgram:
      "Token program",

    mintAuthority:
      "Mint authority",

    freezeAuthority:
      "Freeze authority",

    walletsAnalyzed:
      "Wallets analyzed",

    relationshipsDetected:
      "Relationships detected",

    sharedTransactionsDetected:
      "Shared transactions detected",

    incomingTransfersDetected:
      "Incoming transfers detected",

    sharedFundingSourcesDetected:
      "Shared funding sources detected",

    transactionCount:
      "Transactions observed",

    latestTransactionHash:
      "Latest observed transaction",

    latestTransactionTimestamp:
      "Latest observed transaction time",

    latestBlockHeight:
      "Latest observed block height",

    moduleTotal:
      "Modules evaluated",

    moduleComplete:
      "Complete modules",

    moduleLimited:
      "Limited modules",

    moduleNotRun:
      "Modules not run",

    moduleUnavailable:
      "Unavailable modules",
  };

function cleanText(
  value:
    string
) {
  return value
    .trim();
}

function validIso(
  value:
    string
) {
  return Number.isFinite(
    Date.parse(
      value
    )
  );
}

function metricEntries(
  snapshot:
    HistoricalSnapshotV1
): AdvancedReportMetric[] {
  return Object.entries(
    snapshot.metrics
  )
    .filter(
      (
        entry
      ): entry is [
        string,
        string | number
      ] =>
        entry[1] !==
          null &&
        entry[1] !==
          undefined &&
        (
          typeof entry[1] ===
            "string" ||
          typeof entry[1] ===
            "number"
        )
    )
    .map(
      ([
        key,
        value,
      ]) => ({
        key,

        label:
          METRIC_LABELS[
            key
          ] ??
          key,

        value,
      })
    )
    .sort(
      (
        left,
        right
      ) =>
        left.label.localeCompare(
          right.label
        )
    );
}

function moduleEntries(
  snapshot:
    HistoricalSnapshotV1
): AdvancedReportModule[] {
  return Object.entries(
    snapshot.modules
  )
    .map(
      ([
        id,
        status,
      ]) => ({
        id,
        status,
      })
    )
    .sort(
      (
        left,
        right
      ) =>
        left.id.localeCompare(
          right.id
        )
    );
}

function summaryLines({
  snapshot,
  metrics,
  modules,
}: {
  snapshot:
    HistoricalSnapshotV1;

  metrics:
    readonly AdvancedReportMetric[];

  modules:
    readonly AdvancedReportModule[];
}) {
  const lines:
    string[] = [];

  lines.push(
    `AYZO captured ${metrics.length} reportable metric${metrics.length === 1 ? "" : "s"} and ${modules.length} module state${modules.length === 1 ? "" : "s"} for this bounded analysis.`
  );

  lines.push(
    snapshot.findings.length >
      0
      ? `${snapshot.findings.length} evidence-backed finding summar${snapshot.findings.length === 1 ? "y" : "ies"} are included without extending their original claims.`
      : "No evidence-backed finding summaries were present in the supplied analysis snapshot."
  );

  if (
    snapshot.coverage
  ) {
    lines.push(
      `Recorded analysis coverage: ${snapshot.coverage}.`
    );
  }

  return lines;
}

export function buildAdvancedReport(
  input:
    BuildAdvancedReportInput
): AdvancedReportV1 {
  const title =
    cleanText(
      input.title
    );

  const subjectType =
    cleanText(
      input.subjectType
    );

  const subjectValue =
    cleanText(
      input.subjectValue
    );

  if (
    !title ||
    !subjectType ||
    !subjectValue
  ) {
    throw new Error(
      "Advanced Report requires title, subject type and subject value."
    );
  }

  const generatedAt =
    input.generatedAt ??
    new Date().toISOString();

  if (
    !validIso(
      generatedAt
    )
  ) {
    throw new Error(
      "Advanced Report requires a valid generation timestamp."
    );
  }

  const metrics =
    metricEntries(
      input.snapshot
    );

  const modules =
    moduleEntries(
      input.snapshot
    );

  return {
    version:
      ADVANCED_REPORT_SCHEMA_VERSION,

    reportType:
      "advanced-analysis",

    generatedAt,

    title,

    subject: {
      network:
        input.snapshot.network,

      type:
        subjectType,

      value:
        subjectValue,

      snapshotKind:
        input.snapshot.subjectKind,
    },

    evidence: {
      capturedAt:
        input.snapshot.capturedAt,

      coverage:
        input.snapshot.coverage,

      metricCount:
        metrics.length,

      moduleCount:
        modules.length,

      findingCount:
        input.snapshot.findings.length,
    },

    executiveSummary:
      summaryLines({
        snapshot:
          input.snapshot,

        metrics,

        modules,
      }),

    metrics,

    modules,

    findings:
      input.snapshot.findings.map(
        finding => ({
          ...finding,
        })
      ),

    methodology: [
      "This report is generated from the canonical AYZO analysis snapshot supplied for the current investigation.",
      "Module states, metrics and findings are preserved as evidence summaries rather than converted into ownership, identity, intent or trading conclusions.",
      "The report does not combine incomparable asset values or estimate fiat value unless such data is explicitly present in a future evidence contract.",
    ],

    limitations: [
      "This report reflects bounded evidence available to AYZO at the recorded analysis time and must not be interpreted as exhaustive blockchain history.",
      "Absence of a finding is not proof that the underlying condition does not exist.",
      "Observed relationships, funding paths and transaction activity do not by themselves establish common ownership, identity, control, coordination or malicious intent.",
    ],
  };
}
