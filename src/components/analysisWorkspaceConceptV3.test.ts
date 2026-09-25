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
  "workspace follows the concept composition",
  () => {
    const overview =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceOverview.tsx",
        "utf8"
      );

    assert.ok(
      overview.includes(
        "Follow the evidence."
      )
    );

    assert.ok(
      overview.includes(
        "Observed evidence flows"
      )
    );

    assert.ok(
      overview.includes(
        "Evidence timeline"
      )
    );

    assert.ok(
      overview.includes(
        "Share evidence"
      )
    );

    assert.ok(
      overview.includes(
        "minmax(0,1.78fr)"
      )
    );
  }
);

test(
  "all network reports use shared detailed evidence and research tools",
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
  "legacy large share cards are gone",
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

      assert.equal(
        source.includes(
          "Share Analysis on X"
        ),
        false,
        report
      );
    }
  }
);

test(
  "unavailable graph keeps a truthful analyzed-subject canvas",
  () => {
    const graph =
      fs.readFileSync(
        "src/components/InteractiveEvidenceGraph.tsx",
        "utf8"
      );

    assert.ok(
      graph.includes(
        "ANALYZED SUBJECT"
      )
    );

    assert.ok(
      graph.includes(
        "No supported relationship edges were collected"
      )
    );
  }
);

test(
  "concept rail exposes overview graph activity and details",
  () => {
    const frame =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceFrame.tsx",
        "utf8"
      );

    for (
      const anchor
      of [
        "#analysis-overview",
        "#visual-evidence-graph",
        "#analysis-activity",
        "#analysis-details",
      ]
    ) {
      assert.ok(
        frame.includes(
          anchor
        )
      );
    }
  }
);
