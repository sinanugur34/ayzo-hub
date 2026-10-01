import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const zcash =
  fs.readFileSync(
    "src/components/ZcashIntelligenceReport.tsx",
    "utf8"
  );

const algorand =
  fs.readFileSync(
    "src/components/AlgorandIntelligenceReport.tsx",
    "utf8"
  );

for (
  const [
    label,
    source,
    network,
  ] of [
    [
      "Zcash",
      zcash,
      "zcash",
    ],
    [
      "Algorand",
      algorand,
      "algorand",
    ],
  ] as const
) {
  test(
    `${label} report uses the full AYZO evidence workspace`,
    () => {
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
          "ActivityTimeline"
        )
      );

      assert.ok(
        source.includes(
          "buildHistoricalSnapshot"
        )
      );

      assert.ok(
        source.includes(
          `adapter:\n                "${network}"`
        )
      );

      assert.ok(
        source.includes(
          `network="${network}"`
        )
      );
    }
  );
}

test(
  "Zcash report keeps shielded evidence boundary explicit",
  () => {
    assert.ok(
      zcash.includes(
        "Shielded sender, recipient and amount evidence is never inferred."
      )
    );

    assert.ok(
      zcash.includes(
        "does not infer a hidden sender, recipient, amount, identity or owner"
      )
    );

    assert.equal(
      zcash.includes(
        "shielded owner"
      ),
      false
    );
  }
);

test(
  "Algorand report preserves native authority semantics",
  () => {
    assert.ok(
      algorand.includes(
        "AUTHORIZATION / REKEY EVIDENCE"
      )
    );

    assert.ok(
      algorand.includes(
        "ASA CONTROL FIELDS"
      )
    );

    assert.ok(
      algorand.includes(
        "do not establish beneficial ownership"
      )
    );
  }
);
