import {
  createHash,
} from "node:crypto";

import type {
  BasicAlertRuleType,
} from "@/lib/account/alertRules";

import type {
  HistoricalSnapshotV1,
} from "@/lib/account/historicalSnapshot";

import type {
  AlertEvidenceCategory,
  AlertEvidenceRef,
  AlertObservation,
} from "@/lib/alerts/detection";

type SmartEvidenceRuleType =
  Exclude<
    BasicAlertRuleType,
    "new_activity"
  >;

const metricKeys:
  Record<
    SmartEvidenceRuleType,
    readonly string[]
  > = {
  funding_movement: [
    "incomingTransfersDetected",
    "sharedFundingSourcesDetected",

    "fundingSourceCount",
    "fundingObservationCount",
    "fundingLastSeen",
  ],

  relationship_change: [
    "relationshipsDetected",
    "sharedTransactionsDetected",

    "relationshipCounterpartyCount",
    "relationshipInteractionCount",
    "relationshipLastSeen",
  ],

  contract_activity: [
    "mintAuthority",
    "freezeAuthority",
    "tokenProgram",

    "deploymentDeployer",
    "deploymentTransactionHash",
    "deploymentBlockNumber",

    "developerVerifiedDeploymentCount",
    "developerOtherVerifiedDeploymentCount",
  ],
};

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

function evidenceCategory(
  ruleType:
    SmartEvidenceRuleType
): AlertEvidenceCategory {
  switch (ruleType) {
    case "funding_movement":
      return "funding";

    case "relationship_change":
      return "relationship";

    case "contract_activity":
      return "contract";
  }
}

function findingMatches(
  ruleType:
    SmartEvidenceRuleType,
  category:
    string | null
) {
  const normalized =
    category
      ?.trim()
      .toLowerCase() ??
    "";

  if (!normalized) {
    return false;
  }

  switch (ruleType) {
    case "funding_movement":
      return normalized.includes(
        "funding"
      );

    case "relationship_change":
      return (
        normalized.includes(
          "relationship"
        ) ||
        normalized.includes(
          "graph"
        ) ||
        normalized.includes(
          "counterpart"
        )
      );

    case "contract_activity":
      return (
        normalized.includes(
          "contract"
        ) ||
        normalized.includes(
          "deployment"
        ) ||
        normalized.includes(
          "authority"
        ) ||
        normalized.includes(
          "deployer"
        )
      );
  }
}

function metricEvidence({
  snapshot,
  ruleType,
}: {
  snapshot:
    HistoricalSnapshotV1;

  ruleType:
    SmartEvidenceRuleType;
}) {
  const category =
    evidenceCategory(
      ruleType
    );

  const metrics =
    snapshot.metrics as Record<
      string,
      string |
      number |
      null |
      undefined
    >;

  const evidence:
    AlertEvidenceRef[] =
      [];

  for (
    const key of
    metricKeys[
      ruleType
    ]
  ) {
    const value =
      metrics[key];

    if (
      value ===
        null ||
      value ===
        undefined
    ) {
      continue;
    }

    evidence.push({
      category,

      reference:
        `metric:${key}:${String(
          value
        )}`,

      network:
        snapshot.network,

      occurredAt:
        snapshot.capturedAt,

      evidenceState:
        "SUPPORTED",
    });
  }

  return evidence;
}

function findingEvidence({
  snapshot,
  ruleType,
}: {
  snapshot:
    HistoricalSnapshotV1;

  ruleType:
    SmartEvidenceRuleType;
}) {
  const category =
    evidenceCategory(
      ruleType
    );

  const evidence:
    AlertEvidenceRef[] =
      [];

  for (
    const finding of
    snapshot.findings
  ) {
    if (
      !findingMatches(
        ruleType,
        finding.category
      )
    ) {
      continue;
    }

    const identity =
      JSON.stringify({
        id:
          finding.id,

        category:
          finding.category,

        severity:
          finding.severity,

        confidence:
          finding.confidence,

        title:
          finding.title,
      });

    evidence.push({
      category,

      reference:
        `finding:${sha256(
          identity
        )}`,

      network:
        snapshot.network,

      occurredAt:
        snapshot.capturedAt,

      evidenceState:
        "SUPPORTED",
    });
  }

  return evidence;
}

export function buildSmartAlertObservation({
  snapshot,
  ruleType,
}: {
  snapshot:
    HistoricalSnapshotV1;

  ruleType:
    SmartEvidenceRuleType;
}): AlertObservation {
  const evidence =
    [
      ...metricEvidence({
        snapshot,
        ruleType,
      }),

      ...findingEvidence({
        snapshot,
        ruleType,
      }),
    ];

  return {
    observedAt:
      snapshot.capturedAt,

    evidence,
  };
}
