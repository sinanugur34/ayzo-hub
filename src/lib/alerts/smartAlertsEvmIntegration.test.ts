import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildSmartAlertObservation,
} from "./smartEvidence";

function evmEvidence() {
  return {
    coverage:
      "full",

    assetKind:
      "contract",

    moduleSummary: {
      total:
        9,

      complete:
        9,

      limited:
        0,

      notRun:
        0,

      unavailable:
        0,
    },

    modules: {
      walletRelationships: {
        status:
          "complete",

        data: {
          counterpartyCount:
            4,

          interactionCount:
            11,

          lastSeen:
            "2026-09-27T18:00:00.000Z",
        },
      },

      fundingProvenance: {
        status:
          "complete",

        data: {
          fundingSourceCount:
            3,

          fundingObservationCount:
            7,

          lastSeen:
            "2026-09-27T17:30:00.000Z",
        },
      },

      deploymentIntelligence: {
        status:
          "complete",

        data: {
          deployment: {
            deployerAddress:
              "0x1111111111111111111111111111111111111111",

            transactionHash:
              `0x${"a".repeat(64)}`,

            blockNumber:
              123,
          },
        },
      },

      developerHistory: {
        status:
          "complete",

        data: {
          verifiedDeploymentCount:
            5,

          otherVerifiedDeploymentCount:
            4,
        },
      },
    },

    findings:
      [],
  };
}

test(
  "EVM historical snapshot carries live funding relationship and deployment evidence",
  () => {
    const snapshot =
      buildHistoricalSnapshot(
        "ethereum",
        evmEvidence()
      );

    assert.ok(
      snapshot
    );

    assert.equal(
      snapshot.metrics
        .relationshipCounterpartyCount,
      4
    );

    assert.equal(
      snapshot.metrics
        .relationshipInteractionCount,
      11
    );

    assert.equal(
      snapshot.metrics
        .fundingSourceCount,
      3
    );

    assert.equal(
      snapshot.metrics
        .fundingObservationCount,
      7
    );

    assert.equal(
      snapshot.metrics
        .deploymentBlockNumber,
      123
    );

    assert.equal(
      snapshot.metrics
        .developerVerifiedDeploymentCount,
      5
    );
  }
);

test(
  "EVM Smart Alerts derive rule-specific evidence from normalized production-shaped modules",
  () => {
    const snapshot =
      buildHistoricalSnapshot(
        "ethereum",
        evmEvidence()
      );

    assert.ok(
      snapshot
    );

    const funding =
      buildSmartAlertObservation({
        snapshot,

        ruleType:
          "funding_movement",
      });

    assert.ok(
      funding.evidence.some(
        item =>
          item.reference ===
          "metric:fundingSourceCount:3"
      )
    );

    const relationships =
      buildSmartAlertObservation({
        snapshot,

        ruleType:
          "relationship_change",
      });

    assert.ok(
      relationships.evidence.some(
        item =>
          item.reference ===
          "metric:relationshipCounterpartyCount:4"
      )
    );

    const contract =
      buildSmartAlertObservation({
        snapshot,

        ruleType:
          "contract_activity",
      });

    assert.ok(
      contract.evidence.some(
        item =>
          item.reference ===
          "metric:developerVerifiedDeploymentCount:5"
      )
    );
  }
);

test(
  "Account Smart Alert status requires scheduler and delivery runtime policies",
  () => {
    const route =
      fs.readFileSync(
        "src/app/api/account/alert-rules/route.ts",
        "utf8"
      );

    const panel =
      fs.readFileSync(
        "src/components/account/AlertRulesPanel.tsx",
        "utf8"
      );

    assert.match(
      route,
      /isAlertSchedulerEnabled/
    );

    assert.match(
      route,
      /AYZO_ALERT_SCHEDULER_ENABLED/
    );

    assert.match(
      route,
      /isAlertDeliveryEnabled/
    );

    assert.match(
      route,
      /AYZO_ALERT_DELIVERY_ENABLED/
    );

    assert.match(
      route,
      /isResendAlertProviderReady/
    );

    assert.match(
      panel,
      /PAUSED/
    );

    assert.match(
      panel,
      /monitoringLive/
    );
  }
);
