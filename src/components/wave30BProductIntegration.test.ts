import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const web =
  fs.readFileSync(
    "src/app/api/intelligence/route.ts",
    "utf8"
  );

const mobile =
  fs.readFileSync(
    "src/app/api/mobile/intelligence/route.ts",
    "utf8"
  );

const api =
  fs.readFileSync(
    "src/app/api/v1/intelligence/route.ts",
    "utf8"
  );

const batch =
  fs.readFileSync(
    "src/components/account/BatchAnalysisPanel.tsx",
    "utf8"
  );

for (
  const [
    label,
    source,
  ] of [
    [
      "web",
      web,
    ],
    [
      "mobile",
      mobile,
    ],
    [
      "api-v1",
      api,
    ],
  ] as const
) {
  test(
    `${label} pipeline is prepared for NEAR and Hedera native engines`,
    () => {
      assert.ok(
        source.includes(
          "runNearIntelligence"
        )
      );

      assert.ok(
        source.includes(
          'case "near"'
        )
      );

      assert.ok(
        source.includes(
          "runHederaIntelligence"
        )
      );

      assert.ok(
        source.includes(
          'case "hedera"'
        )
      );
    }
  );
}

test(
  "NEAR report uses shared AYZO evidence workspace",
  () => {
    const source =
      fs.readFileSync(
        "src/components/NearIntelligenceReport.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "AnalysisWorkspaceOverview"
      )
    );

    assert.ok(
      source.includes(
        "AnalysisWorkspaceResearchTools"
      )
    );

    assert.ok(
      source.includes(
        "buildNearVisualEvidenceGraph"
      )
    );

    assert.ok(
      source.includes(
        'network="near"'
      )
    );
  }
);

test(
  "Hedera report uses shared AYZO evidence workspace",
  () => {
    const source =
      fs.readFileSync(
        "src/components/HederaIntelligenceReport.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "AnalysisWorkspaceOverview"
      )
    );

    assert.ok(
      source.includes(
        "AnalysisWorkspaceResearchTools"
      )
    );

    assert.ok(
      source.includes(
        "buildHederaVisualEvidenceGraph"
      )
    );

    assert.ok(
      source.includes(
        'network="hedera"'
      )
    );
  }
);

test(
  "Advanced Batch Analysis derives selectable networks from the canonical live registry",
  () => {
    assert.ok(
      batch.includes(
        "NETWORK_IDS.filter"
      )
    );

    assert.ok(
      batch.includes(
        '.status ==='
      )
    );

    assert.ok(
      batch.includes(
        '"live"'
      )
    );

    assert.ok(
      batch.includes(
        '"/api/intelligence"'
      )
    );

    assert.equal(
      batch.includes(
        'const networks = ['
      ),
      false
    );
  }
);
