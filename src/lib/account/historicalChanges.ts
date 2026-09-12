import type {
  HistoricalSnapshotV1,
} from "@/lib/account/historicalSnapshot";

type Primitive =
  | string
  | number
  | null;

export type HistoricalChangeDirection =
  | "increased"
  | "decreased"
  | "changed"
  | "added"
  | "removed";

export type HistoricalChange = {
  category:
    | "metric"
    | "module"
    | "finding";

  key: string;

  label: string;

  direction:
    HistoricalChangeDirection;

  before:
    Primitive;

  after:
    Primitive;
};

export type HistoricalComparison = {
  version: 1;

  previousCapturedAt:
    string;

  currentCapturedAt:
    string;

  changeCount:
    number;

  hasChanges:
    boolean;

  changes:
    HistoricalChange[];
};

const METRIC_LABELS:
  Record<string, string> = {
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

    walletsAnalyzed:
      "Wallets analyzed",

    relationshipsDetected:
      "Wallet relationships",

    sharedTransactionsDetected:
      "Shared transactions",

    incomingTransfersDetected:
      "Incoming transfers",

    sharedFundingSourcesDetected:
      "Shared funding sources",

    transactionCount:
      "Observed transactions",

    latestTransactionHash:
      "Latest transaction",

    latestTransactionTimestamp:
      "Latest transaction time",

    latestBlockHeight:
      "Latest block height",

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

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function optionalText(
  value: unknown
): string | null {
  return typeof value ===
    "string"
    ? value
    : null;
}

function primitive(
  value: unknown
): Primitive | undefined {
  if (
    value === null
  ) {
    return null;
  }

  if (
    typeof value ===
      "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return undefined;
}

export function parseHistoricalSnapshot(
  value: unknown
): HistoricalSnapshotV1 | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !==
      1 ||
    typeof value.capturedAt !==
      "string" ||
    typeof value.network !==
      "string" ||
    !isRecord(
      value.metrics
    ) ||
    !isRecord(
      value.modules
    ) ||
    !Array.isArray(
      value.findings
    )
  ) {
    return null;
  }

  const coverage =
    value.coverage === null
      ? null
      : optionalText(
          value.coverage
        );

  const subjectKind =
    value.subjectKind === null
      ? null
      : optionalText(
          value.subjectKind
        );

  if (
    value.coverage !==
      null &&
    coverage === null
  ) {
    return null;
  }

  if (
    value.subjectKind !==
      null &&
    subjectKind === null
  ) {
    return null;
  }

  const metrics:
    Record<
      string,
      Primitive
    > = {};

  for (
    const [
      key,
      rawValue,
    ] of Object.entries(
      value.metrics
    )
  ) {
    const parsed =
      primitive(
        rawValue
      );

    if (
      parsed !==
      undefined
    ) {
      metrics[key] =
        parsed;
    }
  }

  const modules:
    Record<
      string,
      string
    > = {};

  for (
    const [
      key,
      rawValue,
    ] of Object.entries(
      value.modules
    )
  ) {
    if (
      typeof rawValue ===
      "string"
    ) {
      modules[key] =
        rawValue;
    }
  }

  const findings =
    value.findings
      .slice(0, 50)
      .flatMap(
        rawFinding => {
          if (
            !isRecord(
              rawFinding
            )
          ) {
            return [];
          }

          return [
            {
              id:
                optionalText(
                  rawFinding.id
                ),

              category:
                optionalText(
                  rawFinding.category
                ),

              severity:
                optionalText(
                  rawFinding.severity
                ),

              confidence:
                optionalText(
                  rawFinding.confidence
                ),

              title:
                optionalText(
                  rawFinding.title
                ),
            },
          ];
        }
      );

  return {
    version: 1,

    capturedAt:
      value.capturedAt,

    network:
      value.network,

    coverage,

    subjectKind,

    metrics:
      metrics as HistoricalSnapshotV1["metrics"],

    modules,

    findings,
  };
}

function changeDirection(
  before:
    Primitive | undefined,
  after:
    Primitive | undefined
): HistoricalChangeDirection {
  if (
    before ===
      undefined ||
    before === null
  ) {
    return "added";
  }

  if (
    after ===
      undefined ||
    after === null
  ) {
    return "removed";
  }

  if (
    typeof before ===
      "number" &&
    typeof after ===
      "number"
  ) {
    if (
      after >
      before
    ) {
      return "increased";
    }

    if (
      after <
      before
    ) {
      return "decreased";
    }
  }

  return "changed";
}

function findingKey(
  finding:
    HistoricalSnapshotV1[
      "findings"
    ][number]
) {
  if (finding.id) {
    return finding.id;
  }

  return [
    finding.category ??
      "",
    finding.title ??
      "",
  ].join("::");
}

export function compareHistoricalSnapshots(
  previousValue:
    unknown,
  currentValue:
    unknown
): HistoricalComparison | null {
  const previous =
    parseHistoricalSnapshot(
      previousValue
    );

  const current =
    parseHistoricalSnapshot(
      currentValue
    );

  if (
    !previous ||
    !current
  ) {
    return null;
  }

  if (
    previous.network !==
    current.network
  ) {
    return null;
  }

  const changes:
    HistoricalChange[] =
      [];

  const previousMetrics =
    previous.metrics as Record<
      string,
      Primitive | undefined
    >;

  const currentMetrics =
    current.metrics as Record<
      string,
      Primitive | undefined
    >;

  const metricKeys =
    new Set([
      ...Object.keys(
        previousMetrics
      ),
      ...Object.keys(
        currentMetrics
      ),
    ]);

  for (
    const key of
    metricKeys
  ) {
    const before =
      previousMetrics[key];

    const after =
      currentMetrics[key];

    if (
      before ===
      after
    ) {
      continue;
    }

    if (
      (
        before ===
          undefined ||
        before ===
          null
      ) &&
      (
        after ===
          undefined ||
        after ===
          null
      )
    ) {
      continue;
    }

    changes.push({
      category:
        "metric",

      key,

      label:
        METRIC_LABELS[
          key
        ] ?? key,

      direction:
        changeDirection(
          before,
          after
        ),

      before:
        before ??
        null,

      after:
        after ??
        null,
    });
  }

  const moduleKeys =
    new Set([
      ...Object.keys(
        previous.modules
      ),
      ...Object.keys(
        current.modules
      ),
    ]);

  for (
    const key of
    moduleKeys
  ) {
    const before =
      previous.modules[
        key
      ];

    const after =
      current.modules[
        key
      ];

    if (
      before ===
      after
    ) {
      continue;
    }

    changes.push({
      category:
        "module",

      key,

      label:
        key,

      direction:
        changeDirection(
          before,
          after
        ),

      before:
        before ??
        null,

      after:
        after ??
        null,
    });
  }

  const previousFindings =
    new Map(
      previous.findings.map(
        finding => [
          findingKey(
            finding
          ),
          finding,
        ]
      )
    );

  const currentFindings =
    new Map(
      current.findings.map(
        finding => [
          findingKey(
            finding
          ),
          finding,
        ]
      )
    );

  const findingKeys =
    new Set([
      ...previousFindings.keys(),
      ...currentFindings.keys(),
    ]);

  for (
    const key of
    findingKeys
  ) {
    const before =
      previousFindings.get(
        key
      );

    const after =
      currentFindings.get(
        key
      );

    if (
      !before &&
      after
    ) {
      changes.push({
        category:
          "finding",

        key,

        label:
          after.title ??
          after.category ??
          "Finding",

        direction:
          "added",

        before:
          null,

        after:
          after.severity ??
          after.confidence ??
          "present",
      });

      continue;
    }

    if (
      before &&
      !after
    ) {
      changes.push({
        category:
          "finding",

        key,

        label:
          before.title ??
          before.category ??
          "Finding",

        direction:
          "removed",

        before:
          before.severity ??
          before.confidence ??
          "present",

        after:
          null,
      });

      continue;
    }

    if (
      !before ||
      !after
    ) {
      continue;
    }

    const beforeState =
      [
        before.severity,
        before.confidence,
        before.title,
      ].join("|");

    const afterState =
      [
        after.severity,
        after.confidence,
        after.title,
      ].join("|");

    if (
      beforeState ===
      afterState
    ) {
      continue;
    }

    changes.push({
      category:
        "finding",

      key,

      label:
        after.title ??
        before.title ??
        after.category ??
        before.category ??
        "Finding",

      direction:
        "changed",

      before:
        before.severity ??
        before.confidence ??
        "present",

      after:
        after.severity ??
        after.confidence ??
        "present",
    });
  }

  return {
    version: 1,

    previousCapturedAt:
      previous.capturedAt,

    currentCapturedAt:
      current.capturedAt,

    changeCount:
      changes.length,

    hasChanges:
      changes.length >
      0,

    changes:
      changes.slice(
        0,
        100
      ),
  };
}
