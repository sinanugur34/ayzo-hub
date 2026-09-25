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
  "every live report uses the shared AYZO workspace overview",
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
          "AnalysisWorkspaceOverview"
        ),
        report
      );
    }
  }
);

test(
  "workspace derives plan access from canonical registry",
  () => {
    const source =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceOverview.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "planHasFeature"
      )
    );

    assert.ok(
      source.includes(
        '"/api/free/status"'
      )
    );

    assert.ok(
      source.includes(
        "FREE"
      )
    );

    assert.ok(
      source.includes(
        "PRO"
      )
    );

    assert.ok(
      source.includes(
        "ADVANCED"
      )
    );

    assert.equal(
      source.includes(
        "mobileApp"
      ),
      false
    );
  }
);

test(
  "workspace exposes overview graph and timeline navigation",
  () => {
    const frame =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceFrame.tsx",
        "utf8"
      );

    const graph =
      fs.readFileSync(
        "src/components/VisualEvidenceGraph.tsx",
        "utf8"
      );

    const timeline =
      fs.readFileSync(
        "src/components/ActivityTimeline.tsx",
        "utf8"
      );

    assert.ok(
      frame.includes(
        "#analysis-overview"
      )
    );

    assert.ok(
      frame.includes(
        "#visual-evidence-graph"
      )
    );

    assert.ok(
      frame.includes(
        "#analysis-activity"
      )
    );

    assert.ok(
      graph.includes(
        'id="visual-evidence-graph"'
      )
    );

    assert.ok(
      timeline.includes(
        'id="analysis-timeline"'
      )
    );
  }
);

test(
  "analysis result workspace is widened for the investigation layout",
  () => {
    const page =
      fs.readFileSync(
        "src/app/page.tsx",
        "utf8"
      );

    assert.ok(
      (
        page.match(
          /<AnalysisWorkspaceFrame>/g
        ) ??
        []
      ).length >= 6
    );

    assert.ok(
      (
        page.match(
          /max-w-\[1540px\]/g
        ) ??
        []
      ).length >= 6
    );
  }
);
