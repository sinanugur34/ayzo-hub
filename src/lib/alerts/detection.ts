import {
  createHash,
} from "node:crypto";

import type {
  BasicAlertRuleType,
} from "@/lib/account/alertRules";

export type AlertEvidenceCategory =
  | "activity"
  | "funding"
  | "relationship"
  | "contract";

export type AlertEvidenceRef = {
  category:
    AlertEvidenceCategory;

  reference:
    string;

  network:
    string | null;

  occurredAt:
    string | null;

  evidenceState:
    "SUPPORTED";
};

export type AlertObservation = {
  observedAt:
    string;

  evidence:
    readonly AlertEvidenceRef[];
};

export type AlertDetectionSnapshot = {
  version:
    1;

  evidence:
    readonly AlertEvidenceRef[];
};

export type AlertEventCandidate = {
  eventKey:
    string;

  eventType:
    BasicAlertRuleType;

  previousStateHash:
    string;

  currentStateHash:
    string;

  evidenceState:
    "SUPPORTED";

  evidenceRefs:
    readonly AlertEvidenceRef[];

  payload: {
    version:
      1;

    newEvidenceCount:
      number;

    category:
      AlertEvidenceCategory;

    summary:
      string;
  };
};

export type AlertDetectionResult = {
  outcome:
    | "baseline"
    | "no_change"
    | "changed";

  snapshot:
    AlertDetectionSnapshot;

  stateHash:
    string;

  event:
    AlertEventCandidate | null;
};

const MAX_STATE_EVIDENCE =
  256;

const categories:
  readonly AlertEvidenceCategory[] = [
    "activity",
    "funding",
    "relationship",
    "contract",
  ];

function categoryForRule(
  ruleType:
    BasicAlertRuleType
): AlertEvidenceCategory {
  switch (ruleType) {
    case "new_activity":
      return "activity";

    case "funding_movement":
      return "funding";

    case "relationship_change":
      return "relationship";

    case "contract_activity":
      return "contract";
  }
}

function sha256(
  value:
    string
) {
  return createHash(
    "sha256"
  )
    .update(
      value,
      "utf8"
    )
    .digest(
      "hex"
    );
}

function validTimestamp(
  value:
    string
) {
  return Number.isFinite(
    Date.parse(
      value
    )
  );
}

function evidenceKey(
  evidence:
    AlertEvidenceRef
) {
  return JSON.stringify([
    evidence.category,
    evidence.network,
    evidence.reference,
  ]);
}

function normalizeEvidence(
  value:
    AlertEvidenceRef
): AlertEvidenceRef {
  if (
    !categories.includes(
      value.category
    )
  ) {
    throw new Error(
      "Unsupported alert evidence category."
    );
  }

  if (
    value.evidenceState !==
    "SUPPORTED"
  ) {
    throw new Error(
      "Alert detection accepts SUPPORTED evidence only."
    );
  }

  const reference =
    value.reference.trim();

  if (
    !reference ||
    reference.length >
      1024
  ) {
    throw new Error(
      "Invalid alert evidence reference."
    );
  }

  const network =
    value.network ===
      null
      ? null
      : value.network
          .trim();

  if (
    network !==
      null &&
    (
      !network ||
      network.length >
        64
    )
  ) {
    throw new Error(
      "Invalid alert evidence network."
    );
  }

  if (
    value.occurredAt !==
      null &&
    !validTimestamp(
      value.occurredAt
    )
  ) {
    throw new Error(
      "Invalid alert evidence timestamp."
    );
  }

  return {
    category:
      value.category,

    reference,

    network,

    occurredAt:
      value.occurredAt,

    evidenceState:
      "SUPPORTED",
  };
}

function buildSnapshot(
  ruleType:
    BasicAlertRuleType,
  evidence:
    readonly AlertEvidenceRef[]
): AlertDetectionSnapshot {
  const category =
    categoryForRule(
      ruleType
    );

  const deduplicated =
    new Map<
      string,
      AlertEvidenceRef
    >();

  for (
    const raw of evidence
  ) {
    const normalized =
      normalizeEvidence(
        raw
      );

    if (
      normalized.category !==
      category
    ) {
      continue;
    }

    deduplicated.set(
      evidenceKey(
        normalized
      ),
      normalized
    );
  }

  const normalizedEvidence =
    Array.from(
      deduplicated.values()
    )
      .sort(
        (
          left,
          right
        ) =>
          evidenceKey(
            left
          ).localeCompare(
            evidenceKey(
              right
            )
          )
      )
      .slice(
        -MAX_STATE_EVIDENCE
      );

  return {
    version:
      1,

    evidence:
      normalizedEvidence,
  };
}

export function hashAlertDetectionSnapshot(
  snapshot:
    AlertDetectionSnapshot
) {
  return sha256(
    JSON.stringify({
      version:
        snapshot.version,

      evidence:
        snapshot.evidence.map(
          evidence => ({
            category:
              evidence.category,

            network:
              evidence.network,

            reference:
              evidence.reference,

            occurredAt:
              evidence.occurredAt,

            evidenceState:
              evidence.evidenceState,
          })
        ),
    })
  );
}

export function parseAlertDetectionSnapshot(
  value:
    unknown
): AlertDetectionSnapshot | null {
  if (
    typeof value !==
      "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    record.version !==
      1 ||
    !Array.isArray(
      record.evidence
    )
  ) {
    return null;
  }

  try {
    const evidence =
      record.evidence.map(
        item => {
          if (
            typeof item !==
              "object" ||
            item ===
              null ||
            Array.isArray(
              item
            )
          ) {
            throw new Error();
          }

          const row =
            item as Record<
              string,
              unknown
            >;

          if (
            typeof row.category !==
              "string" ||
            !categories.includes(
              row.category as
                AlertEvidenceCategory
            ) ||
            typeof row.reference !==
              "string" ||
            (
              row.network !==
                null &&
              typeof row.network !==
                "string"
            ) ||
            (
              row.occurredAt !==
                null &&
              typeof row.occurredAt !==
                "string"
            ) ||
            row.evidenceState !==
              "SUPPORTED"
          ) {
            throw new Error();
          }

          return normalizeEvidence({
            category:
              row.category as
                AlertEvidenceCategory,

            reference:
              row.reference,

            network:
              row.network as
                string | null,

            occurredAt:
              row.occurredAt as
                string | null,

            evidenceState:
              "SUPPORTED",
          });
        }
      );

    if (
      evidence.length >
      MAX_STATE_EVIDENCE
    ) {
      return null;
    }

    return {
      version:
        1,

      evidence,
    };
  } catch {
    return null;
  }
}

function eventSummary(
  ruleType:
    BasicAlertRuleType,
  count:
    number
) {
  switch (ruleType) {
    case "new_activity":
      return `${count} newly observed activity evidence reference${count === 1 ? "" : "s"}.`;

    case "funding_movement":
      return `${count} newly observed funding evidence reference${count === 1 ? "" : "s"}.`;

    case "relationship_change":
      return `${count} newly observed relationship evidence reference${count === 1 ? "" : "s"}.`;

    case "contract_activity":
      return `${count} newly observed contract-activity evidence reference${count === 1 ? "" : "s"}.`;
  }
}

export function evaluateAlertObservation({
  ruleType,
  previousSnapshot,
  observation,
}: {
  ruleType:
    BasicAlertRuleType;

  previousSnapshot:
    AlertDetectionSnapshot | null;

  observation:
    AlertObservation;
}): AlertDetectionResult {
  if (
    !validTimestamp(
      observation.observedAt
    )
  ) {
    throw new Error(
      "Invalid alert observation timestamp."
    );
  }

  const snapshot =
    buildSnapshot(
      ruleType,
      observation.evidence
    );

  const stateHash =
    hashAlertDetectionSnapshot(
      snapshot
    );

  /*
   * First observation establishes a
   * baseline. Historical evidence must
   * not generate a false "new" alert.
   */
  if (
    previousSnapshot ===
      null
  ) {
    return {
      outcome:
        "baseline",

      snapshot,

      stateHash,

      event:
        null,
    };
  }

  const previousHash =
    hashAlertDetectionSnapshot(
      previousSnapshot
    );

  if (
    previousHash ===
    stateHash
  ) {
    return {
      outcome:
        "no_change",

      snapshot,

      stateHash,

      event:
        null,
    };
  }

  const previousKeys =
    new Set(
      previousSnapshot
        .evidence
        .map(
          evidenceKey
        )
    );

  const newEvidence =
    snapshot.evidence.filter(
      evidence =>
        !previousKeys.has(
          evidenceKey(
            evidence
          )
        )
    );

  /*
   * The bounded window may shrink or
   * old evidence may disappear.
   *
   * Losing old evidence is not an alert.
   */
  if (
    newEvidence.length ===
    0
  ) {
    return {
      outcome:
        "no_change",

      snapshot,

      stateHash,

      event:
        null,
    };
  }

  const category =
    categoryForRule(
      ruleType
    );

  const eventKey =
    sha256(
      JSON.stringify({
        version:
          1,

        ruleType,

        evidence:
          newEvidence
            .map(
              evidenceKey
            )
            .sort(),
      })
    );

  return {
    outcome:
      "changed",

    snapshot,

    stateHash,

    event: {
      eventKey,

      eventType:
        ruleType,

      previousStateHash:
        previousHash,

      currentStateHash:
        stateHash,

      evidenceState:
        "SUPPORTED",

      evidenceRefs:
        newEvidence,

      payload: {
        version:
          1,

        newEvidenceCount:
          newEvidence.length,

        category,

        summary:
          eventSummary(
            ruleType,
            newEvidence.length
          ),
      },
    },
  };
}
