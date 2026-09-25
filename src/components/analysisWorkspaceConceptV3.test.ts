import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reports = [
  "src/components/IntelligenceReport.tsx",
  "src/components/EvmIntelligenceReport.tsx",
  "src/components/BitcoinIntelligenceReport.tsx",
  "src/components/DogecoinIntelligenceReport.tsx",
  "src/components/TronIntelligenceReport.tsx",
  "src/components/XrplIntelligenceReport.tsx",
];

test(
  "workspace keeps the approved evidence concept composition",
  () => {
    const overview =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceOverview.tsx",
        "utf8"
      );

    const activity =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    const source =
      overview +
      activity;

    for (
      const text
      of [
        "Follow the evidence.",
        "Incoming and outgoing funds",
        "Flow over time",
        "Transaction timeline",
        "Share evidence",
      ]
    ) {
      assert.ok(
        source.includes(
          text
        ),
        text
      );
    }
  }
);

test(
  "all network reports keep detailed evidence and research tools",
  () => {
    for (
      const report
      of reports
    ) {
      const source =
        fs.readFileSync(
          report,
          "utf8"
        );

      assert.ok(
        source.includes(
          "AnalysisWorkspaceDetails"
        ),
        report
      );

      assert.ok(
        source.includes(
          "AnalysisWorkspaceResearchTools"
        ),
        report
      );

      assert.ok(
        source.includes(
          "timeline="
        ),
        report
      );
    }
  }
);

test(
  "old large share cards stay removed",
  () => {
    for (
      const report
      of [
        "src/components/IntelligenceReport.tsx",
        "src/components/EvmIntelligenceReport.tsx",
      ]
    ) {
      const source =
        fs.readFileSync(
          report,
          "utf8"
        );

      assert.equal(
        source.includes(
          "SHARE AYZO"
        ),
        false,
        report
      );
    }
  }
);

test(
  "unavailable graph remains truthful",
  () => {
    const source =
      fs.readFileSync(
        "src/components/InteractiveEvidenceGraph.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "ANALYZED SUBJECT"
      )
    );

    assert.ok(
      source.includes(
        "No supported relationship edges were collected"
      )
    );

    assert.ok(
      source.includes(
        "Connection ≠ common ownership"
      )
    );
  }
);
