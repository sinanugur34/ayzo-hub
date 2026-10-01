import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const paths = [
  "src/components/ZcashIntelligenceReport.tsx",
  "src/components/AlgorandIntelligenceReport.tsx",
  "src/components/PolkadotIntelligenceReport.tsx",
  "src/components/CosmosSdkIntelligenceReport.tsx",
];

test(
  "final five report architecture keeps AYZO evidence workspace and research tools",
  () => {
    for (
      const path of
      paths
    ) {
      const source =
        fs.readFileSync(
          path,
          "utf8"
        );

      assert.ok(
        source.includes(
          "AnalysisWorkspaceOverview"
        )
      );

      assert.ok(
        source.includes(
          "AnalysisWorkspaceDetails"
        )
      );

      assert.ok(
        source.includes(
          "AnalysisWorkspaceResearchTools"
        )
      );

      assert.ok(
        source.includes(
          "AnalysisActions"
        )
      );

      assert.ok(
        source.includes(
          "buildHistoricalSnapshot"
        )
      );
    }
  }
);

test(
  "native expansion reports preserve evidence-first limitations",
  () => {
    const polkadot =
      fs.readFileSync(
        "src/components/PolkadotIntelligenceReport.tsx",
        "utf8"
      );

    const cosmos =
      fs.readFileSync(
        "src/components/CosmosSdkIntelligenceReport.tsx",
        "utf8"
      );

    assert.match(
      polkadot,
      /do not establish beneficial ownership/i
    );

    assert.ok(
      cosmos.includes(
        "INJECTIVE NATIVE MODULE ACTIVITY"
      )
    );

    assert.ok(
      cosmos.includes(
        "STAKING + IBC"
      )
    );
  }
);
