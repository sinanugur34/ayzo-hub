import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  parseEvaluationRule,
  planDirectActivityTarget,
} from "./evaluator";

import {
  buildSmartAlertObservation,
} from "./smartEvidence";

import type {
  HistoricalSnapshotV1,
} from "@/lib/account/historicalSnapshot";

function snapshot():
  HistoricalSnapshotV1 {
  return {
    version:
      1,

    capturedAt:
      "2026-09-27T18:30:00.000Z",

    network:
      "ethereum",

    coverage:
      "complete",

    subjectKind:
      "wallet",

    metrics: {
      incomingTransfersDetected:
        4,

      sharedFundingSourcesDetected:
        2,

      relationshipsDetected:
        7,

      sharedTransactionsDetected:
        3,

      mintAuthority:
        "0x1111111111111111111111111111111111111111",

      freezeAuthority:
        null,

      tokenProgram:
        "erc20",
    },

    modules: {
      provider:
        "complete",
    },

    findings: [
      {
        id:
          "funding-one",

        category:
          "funding",

        severity:
          "informational",

        confidence:
          "high",

        title:
          "Funding provenance observed",
      },

      {
        id:
          "graph-one",

        category:
          "wallet-graph",

        severity:
          "informational",

        confidence:
          "high",

        title:
          "Relationship graph observed",
      },

      {
        id:
          "deploy-one",

        category:
          "deployment",

        severity:
          "informational",

        confidence:
          "high",

        title:
          "Contract deployment verified",
      },
    ],
  };
}

test(
  "evaluator accepts every supported alert rule type",
  () => {
    for (
      const ruleType of [
        "new_activity",
        "funding_movement",
        "relationship_change",
        "contract_activity",
      ] as const
    ) {
      const parsed =
        parseEvaluationRule({
          id:
            "rule",

          user_id:
            "user",

          network:
            "ethereum",

          subject_type:
            "wallet",

          subject_value:
            "0x1111111111111111111111111111111111111111",

          rule_type:
            ruleType,

          enabled:
            true,
        });

      assert.equal(
        parsed?.ruleType,
        ruleType
      );
    }
  }
);

test(
  "planner bounds live monitoring to Bitcoin and EVM adapters",
  () => {
    const unsupported =
      parseEvaluationRule({
        id:
          "rule",

        user_id:
          "user",

        network:
          "solana",

        subject_type:
          "token",

        subject_value:
          "subject",

        rule_type:
          "funding_movement",

        enabled:
          true,
      });

    assert.ok(
      unsupported
    );

    assert.equal(
      planDirectActivityTarget(
        unsupported
      ).status,
      "skip"
    );

    const bitcoinContract =
      parseEvaluationRule({
        id:
          "rule-2",

        user_id:
          "user",

        network:
          "bitcoin",

        subject_type:
          "wallet",

        subject_value:
          "bc1qexample",

        rule_type:
          "contract_activity",

        enabled:
          true,
      });

    assert.ok(
      bitcoinContract
    );

    const plan =
      planDirectActivityTarget(
        bitcoinContract
      );

    assert.equal(
      plan.status,
      "skip"
    );

    if (
      plan.status ===
        "skip"
    ) {
      assert.equal(
        plan.reason,
        "unsupported_rule"
      );
    }
  }
);

test(
  "smart funding observation contains only funding evidence",
  () => {
    const observation =
      buildSmartAlertObservation({
        snapshot:
          snapshot(),

        ruleType:
          "funding_movement",
      });

    assert.equal(
      observation.observedAt,
      "2026-09-27T18:30:00.000Z"
    );

    assert.ok(
      observation.evidence.length >=
        3
    );

    assert.equal(
      observation.evidence.every(
        item =>
          item.category ===
          "funding"
      ),
      true
    );
  }
);

test(
  "smart relationship and contract evidence stay category isolated",
  () => {
    const relationship =
      buildSmartAlertObservation({
        snapshot:
          snapshot(),

        ruleType:
          "relationship_change",
      });

    assert.equal(
      relationship.evidence.every(
        item =>
          item.category ===
          "relationship"
      ),
      true
    );

    const contract =
      buildSmartAlertObservation({
        snapshot:
          snapshot(),

        ruleType:
          "contract_activity",
      });

    assert.equal(
      contract.evidence.every(
        item =>
          item.category ===
          "contract"
      ),
      true
    );

    assert.ok(
      contract.evidence.some(
        item =>
          item.reference.includes(
            "mintAuthority"
          )
      )
    );
  }
);

test(
  "scheduler no longer filters direct monitoring to new_activity",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/alerts/evaluationBatch.ts",
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /\.eq\(\s*"rule_type",\s*"new_activity"\s*\)/
    );

    assert.match(
      source,
      /ruleType:\s*rule\.ruleType/
    );

    assert.match(
      source,
      /\.is\(\s*"watchlist_id",\s*null\s*\)/
    );
  }
);

test(
  "monitoring observer reuses AYZO historical snapshot normalization",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/alerts/monitoringObserver.ts",
        "utf8"
      );

    assert.match(
      source,
      /buildHistoricalSnapshot/
    );

    assert.match(
      source,
      /buildSmartAlertObservation/
    );

    assert.match(
      source,
      /ruleType ===\s*"new_activity"/
    );
  }
);
