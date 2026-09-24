import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvestigationComparison,
  parseCompareInvestigationsInput,
} from "./compareInvestigations";

const leftId =
  "11111111-2222-4333-8444-555555555555";

const rightId =
  "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test(
  "requires two different saved analysis UUIDs",
  () => {
    assert.deepEqual(
      parseCompareInvestigationsInput({
        leftSavedAnalysisId:
          leftId,
        rightSavedAnalysisId:
          rightId,
      }),
      {
        leftSavedAnalysisId:
          leftId,
        rightSavedAnalysisId:
          rightId,
      }
    );

    assert.equal(
      parseCompareInvestigationsInput({
        leftSavedAnalysisId:
          leftId,
        rightSavedAnalysisId:
          leftId,
      }),
      null
    );
  }
);

test(
  "builds deterministic evidence structure comparison",
  () => {
    const result =
      buildInvestigationComparison(
        {
          id:
            leftId,
          network:
            "bitcoin",
          subjectType:
            "wallet",
          subjectValue:
            "left",
          title:
            "Left",
          createdAt:
            "2026-09-24T00:00:00Z",
          analysisPayload: {
            summary: {
              count:
                1,
            },
            funding: {
              status:
                "observed",
            },
          },
        },
        {
          id:
            rightId,
          network:
            "bitcoin",
          subjectType:
            "wallet",
          subjectValue:
            "right",
          title:
            "Right",
          createdAt:
            "2026-09-24T00:01:00Z",
          analysisPayload: {
            summary: {
              count:
                2,
            },
            history: {
              status:
                "observed",
            },
          },
        }
      );

    assert.equal(
      result.subjects
        .sameNetwork,
      true
    );

    assert.deepEqual(
      result.payload
        .changedKeys,
      [
        "summary",
      ]
    );

    assert.deepEqual(
      result.payload
        .leftOnlyKeys,
      [
        "funding",
      ]
    );

    assert.deepEqual(
      result.payload
        .rightOnlyKeys,
      [
        "history",
      ]
    );
  }
);
