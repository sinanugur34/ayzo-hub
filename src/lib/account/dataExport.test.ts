import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvancedReport,
} from "./advancedReport";

import {
  buildDataExport,
} from "./dataExport";

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
      3,

    moduleComplete:
      2,

    moduleLimited:
      1,
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
        "finding-1",

      category:
        "market-flow",

      severity:
        "informational",

      confidence:
        "high",

      title:
        '=HYPERLINK("https://example.com")',
    },
  ],
};

const report =
  buildAdvancedReport({
    title:
      "Ethereum Wallet Analysis",

    subjectType:
      "wallet",

    subjectValue:
      "0x1111111111111111111111111111111111111111",

    snapshot,

    generatedAt:
      "2026-09-14T09:00:00.000Z",
  });

test(
  "builds deterministic JSON export",
  () => {
    const first =
      buildDataExport(
        report,
        "json"
      );

    const second =
      buildDataExport(
        report,
        "json"
      );

    assert.deepEqual(
      first,
      second
    );

    assert.equal(
      first.contentType,
      "application/json; charset=utf-8"
    );

    assert.equal(
      first.filename,
      "ayzo-ethereum-wallet-0x111111111111111111111111111111-2026-09-14.json"
    );

    const parsed =
      JSON.parse(
        first.content
      );

    assert.equal(
      parsed.schemaVersion,
      1
    );

    assert.equal(
      parsed.exportType,
      "ayzo-advanced-report"
    );

    assert.equal(
      parsed.report.subject.network,
      "ethereum"
    );
  }
);

test(
  "builds deterministic CSV export with stable headers",
  () => {
    const result =
      buildDataExport(
        report,
        "csv"
      );

    const lines =
      result.content
        .trimEnd()
        .split("\n");

    assert.equal(
      lines[0],
      "section,key,label,value,status,category,severity,confidence,title"
    );

    assert.equal(
      result.contentType,
      "text/csv; charset=utf-8"
    );

    assert.equal(
      result.filename,
      "ayzo-ethereum-wallet-0x111111111111111111111111111111-2026-09-14.csv"
    );

    assert.match(
      result.content,
      /executive-summary/
    );

    assert.match(
      result.content,
      /marketFlowIntelligence/
    );
  }
);

test(
  "neutralizes spreadsheet formula injection in CSV strings",
  () => {
    const result =
      buildDataExport(
        report,
        "csv"
      );

    assert.match(
      result.content,
      /'=HYPERLINK/
    );

    assert.doesNotMatch(
      result.content,
      /,"=HYPERLINK/
    );
  }
);
