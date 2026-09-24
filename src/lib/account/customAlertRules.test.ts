import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCreateCustomAlertRule,
  readAlertRuleMinimumNewEvidence,
} from "./alertRules";

import {
  evaluateAlertObservation,
} from "@/lib/alerts/detection";

test(
  "parses bounded Advanced custom alert configuration",
  () => {
    assert.deepEqual(
      parseCreateCustomAlertRule({
        network:
          "bitcoin",
        subjectType:
          "wallet",
        subjectValue:
          "subject",
        minimumNewEvidence:
          3,
      }),
      {
        network:
          "bitcoin",
        subjectType:
          "wallet",
        subjectValue:
          "subject",
        minimumNewEvidence:
          3,
        enabled:
          true,
      }
    );

    assert.equal(
      parseCreateCustomAlertRule({
        network:
          "bitcoin",
        subjectType:
          "wallet",
        subjectValue:
          "subject",
        minimumNewEvidence:
          21,
      }),
      null
    );
  }
);

test(
  "reads custom threshold and defaults basic rules to one",
  () => {
    assert.equal(
      readAlertRuleMinimumNewEvidence({
        mode:
          "advanced_custom",
        minimumNewEvidence:
          4,
      }),
      4
    );

    assert.equal(
      readAlertRuleMinimumNewEvidence({
        mode:
          "definition_only",
      }),
      1
    );
  }
);

test(
  "custom threshold suppresses a single new evidence reference",
  () => {
    const previous = {
      version:
        1 as const,
      evidence: [
        {
          category:
            "activity" as const,
          reference:
            "tx:a",
          network:
            "bitcoin",
          occurredAt:
            null,
          evidenceState:
            "SUPPORTED" as const,
        },
      ],
    };

    const result =
      evaluateAlertObservation({
        ruleType:
          "new_activity",
        previousSnapshot:
          previous,
        minimumNewEvidence:
          2,
        observation: {
          observedAt:
            "2026-09-24T18:00:00Z",
          evidence: [
            ...previous.evidence,
            {
              category:
                "activity",
              reference:
                "tx:b",
              network:
                "bitcoin",
              occurredAt:
                null,
              evidenceState:
                "SUPPORTED",
            },
          ],
        },
      });

    assert.equal(
      result.outcome,
      "no_change"
    );

    assert.equal(
      result.event,
      null
    );
  }
);

test(
  "custom threshold creates event when enough new evidence appears",
  () => {
    const previous = {
      version:
        1 as const,
      evidence: [
        {
          category:
            "activity" as const,
          reference:
            "tx:a",
          network:
            "bitcoin",
          occurredAt:
            null,
          evidenceState:
            "SUPPORTED" as const,
        },
      ],
    };

    const result =
      evaluateAlertObservation({
        ruleType:
          "new_activity",
        previousSnapshot:
          previous,
        minimumNewEvidence:
          2,
        observation: {
          observedAt:
            "2026-09-24T18:00:00Z",
          evidence: [
            ...previous.evidence,
            {
              category:
                "activity",
              reference:
                "tx:b",
              network:
                "bitcoin",
              occurredAt:
                null,
              evidenceState:
                "SUPPORTED",
            },
            {
              category:
                "activity",
              reference:
                "tx:c",
              network:
                "bitcoin",
              occurredAt:
                null,
              evidenceState:
                "SUPPORTED",
            },
          ],
        },
      });

    assert.equal(
      result.outcome,
      "changed"
    );

    assert.equal(
      result.event
        ?.payload
        .newEvidenceCount,
      2
    );
  }
);
