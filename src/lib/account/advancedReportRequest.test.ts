import assert from "node:assert/strict";
import test from "node:test";

import {
  handleAdvancedReportRequest,
} from "./advancedReportRequest";

const snapshot = {
  version:
    1,

  capturedAt:
    "2026-09-14T08:00:00.000Z",

  network:
    "ethereum",

  coverage:
    "partial",

  subjectKind:
    "wallet",

  metrics: {
    moduleTotal:
      5,

    moduleComplete:
      3,

    moduleLimited:
      2,
  },

  modules: {
    walletGraph:
      "complete",

    marketFlowIntelligence:
      "limited",
  },

  findings: [
    {
      id:
        "flow-1",

      category:
        "market-flow",

      severity:
        "informational",

      confidence:
        "high",

      title:
        "Market flow evidence observed",
    },
  ],
};

const validBody = {
  network:
    "ethereum",

  subjectType:
    "wallet",

  subjectValue:
    "0x1111111111111111111111111111111111111111",

  title:
    "Ethereum Wallet Analysis",

  currentSnapshot:
    snapshot,
};

test(
  "unauthenticated request is rejected before report generation",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          false,

        planId:
          "pro",

        body:
          validBody,
      });

    assert.equal(
      result.status,
      401
    );

    assert.deepEqual(
      result.body,
      {
        error:
          "Unauthorized",
      }
    );
  }
);

test(
  "Free plan is rejected server-side",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          true,

        planId:
          "free",

        body:
          validBody,
      });

    assert.equal(
      result.status,
      403
    );

    assert.deepEqual(
      result.body,
      {
        error:
          "Advanced Reports requires AYZO Pro or Advanced.",

        code:
          "PLAN_REQUIRED",
      }
    );
  }
);

test(
  "invalid payload is rejected",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body: {
          network:
            "ethereum",
        },
      });

    assert.equal(
      result.status,
      400
    );
  }
);

test(
  "snapshot network mismatch is rejected",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body: {
          ...validBody,

          network:
            "base",
        },
      });

    assert.equal(
      result.status,
      400
    );

    assert.deepEqual(
      result.body,
      {
        error:
          "Snapshot network does not match request network.",
      }
    );
  }
);

test(
  "Pro generates Advanced Report V1",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body:
          validBody,

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      result.status,
      200
    );

    if (
      result.status !==
      200
    ) {
      throw new Error(
        "Expected successful Pro report."
      );
    }

    assert.equal(
      result.body.report.version,
      1
    );

    assert.equal(
      result.body.report.subject.network,
      "ethereum"
    );

    assert.equal(
      result.body.report.generatedAt,
      "2026-09-14T09:00:00.000Z"
    );
  }
);

test(
  "Advanced inherits Pro report capability",
  () => {
    const result =
      handleAdvancedReportRequest({
        authenticated:
          true,

        planId:
          "advanced",

        body:
          validBody,

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      result.status,
      200
    );

    if (
      result.status !==
      200
    ) {
      throw new Error(
        "Expected successful Advanced report."
      );
    }

    assert.equal(
      result.body.report.reportType,
      "advanced-analysis"
    );
  }
);
