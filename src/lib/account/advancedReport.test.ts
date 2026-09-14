import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVANCED_REPORT_SCHEMA_VERSION,
  buildAdvancedReport,
} from "./advancedReport";

import type {
  HistoricalSnapshotV1,
} from "./historicalSnapshot";

const snapshot:
  HistoricalSnapshotV1 = {
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
      9,

    moduleComplete:
      6,

    moduleLimited:
      2,

    moduleNotRun:
      1,
  },

  modules: {
    walletGraph:
      "complete",

    marketFlowIntelligence:
      "limited",

    fundingProvenance:
      "complete",
  },

  findings: [
    {
      id:
        "finding-1",

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

test(
  "builds a deterministic evidence-first advanced report",
  () => {
    const report =
      buildAdvancedReport({
        title:
          "Ethereum Address Analysis",

        subjectType:
          "entity",

        subjectValue:
          "0x1111111111111111111111111111111111111111",

        snapshot,

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      report.version,
      ADVANCED_REPORT_SCHEMA_VERSION
    );

    assert.equal(
      report.reportType,
      "advanced-analysis"
    );

    assert.equal(
      report.generatedAt,
      "2026-09-14T09:00:00.000Z"
    );

    assert.equal(
      report.subject.network,
      "ethereum"
    );

    assert.equal(
      report.subject.snapshotKind,
      "wallet"
    );

    assert.equal(
      report.evidence.metricCount,
      4
    );

    assert.equal(
      report.evidence.moduleCount,
      3
    );

    assert.equal(
      report.evidence.findingCount,
      1
    );

    assert.deepEqual(
      report.modules.map(
        item =>
          item.id
      ),
      [
        "fundingProvenance",
        "marketFlowIntelligence",
        "walletGraph",
      ]
    );

    assert.equal(
      report.findings[0]
        ?.title,
      "Market flow evidence observed"
    );

    assert.match(
      report.executiveSummary[0] ??
        "",
      /4 reportable metrics/
    );

    assert.match(
      report.limitations[0] ??
        "",
      /bounded evidence/
    );
  }
);

test(
  "does not invent risk scores, ownership or fiat values",
  () => {
    const report =
      buildAdvancedReport({
        title:
          "Analysis",

        subjectType:
          "wallet",

        subjectValue:
          "subject",

        snapshot,

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      "riskScore" in report,
      false
    );

    assert.equal(
      "usdValue" in report,
      false
    );

    assert.equal(
      "owner" in report.subject,
      false
    );
  }
);

test(
  "rejects invalid report identity and timestamp",
  () => {
    assert.throws(
      () =>
        buildAdvancedReport({
          title:
            "",

          subjectType:
            "wallet",

          subjectValue:
            "subject",

          snapshot,
        }),
      /requires title/
    );

    assert.throws(
      () =>
        buildAdvancedReport({
          title:
            "Analysis",

          subjectType:
            "wallet",

          subjectValue:
            "subject",

          snapshot,

          generatedAt:
            "invalid",
        }),
      /valid generation timestamp/
    );
  }
);
