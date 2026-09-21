type JsonRecord =
  Record<string, unknown>;

export type MobileFindingSummary = {
  id: string;
  category: string | null;
  title: string;
  summary: string | null;
  severity: string | null;
  confidence: string | null;
};

export type MobileModuleSummary = {
  id: string;
  label: string;
  status: string;
  detail: string | null;
};

export type MobileResultSummary = {
  coverage: string | null;
  findings: readonly MobileFindingSummary[];
  modules: readonly MobileModuleSummary[];
  caveats: readonly string[];
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringValue(
  value: unknown
) {
  return typeof value === "string"
    ? value
    : null;
}

function labelize(
  value: string
) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^./,
      (letter) =>
        letter.toUpperCase()
    );
}

function readFindings(
  root: JsonRecord
): MobileFindingSummary[] {
  if (
    !Array.isArray(
      root.findings
    )
  ) {
    return [];
  }

  return root.findings.flatMap(
    (
      value,
      index
    ) => {
      if (!isRecord(value)) {
        return [];
      }

      const title =
        stringValue(
          value.title
        );

      if (!title) {
        return [];
      }

      return [
        {
          id:
            stringValue(
              value.id
            ) ??
            `finding-${index}`,
          category:
            stringValue(
              value.category
            ),
          title,
          summary:
            stringValue(
              value.summary
            ),
          severity:
            stringValue(
              value.severity
            ),
          confidence:
            stringValue(
              value.confidence
            ),
        },
      ];
    }
  );
}

function readModules(
  root: JsonRecord
): MobileModuleSummary[] {
  const modules =
    root.modules;

  if (isRecord(modules)) {
    return Object.entries(
      modules
    ).flatMap(
      ([
        id,
        value,
      ]) => {
        if (!isRecord(value)) {
          return [];
        }

        const status =
          stringValue(
            value.status
          );

        if (!status) {
          return [];
        }

        return [
          {
            id,
            label:
              labelize(id),
            status,
            detail:
              stringValue(
                value.limitation
              ) ??
              stringValue(
                value.error
              ),
          },
        ];
      }
    );
  }

  /*
   * Solana currently returns major
   * evidence sections directly rather
   * than under a modules object.
   */
  const fallbackSections = [
    "holders",
    "relationships",
    "funding",
    "history",
    "canonicalTransaction",
  ] as const;

  return fallbackSections.flatMap(
    (id) => {
      const value =
        root[id];

      if (
        value === null ||
        value === undefined
      ) {
        return [];
      }

      return [
        {
          id,
          label:
            labelize(id),
          status:
            "observed",
          detail:
            null,
        },
      ];
    }
  );
}

function readCaveats(
  root: JsonRecord
) {
  if (
    !Array.isArray(
      root.caveats
    )
  ) {
    return [];
  }

  return root.caveats.filter(
    (
      value
    ): value is string =>
      typeof value ===
      "string"
  );
}

export function buildMobileResultSummary(
  data: unknown
): MobileResultSummary {
  if (!isRecord(data)) {
    return {
      coverage: null,
      findings: [],
      modules: [],
      caveats: [],
    };
  }

  return {
    coverage:
      stringValue(
        data.coverage
      ),
    findings:
      readFindings(data),
    modules:
      readModules(data),
    caveats:
      readCaveats(data),
  };
}
