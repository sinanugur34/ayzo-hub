import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const visual =
  fs.readFileSync(
    "src/components/AdvancedEvidenceVisualSummary.tsx",
    "utf8"
  );

const snapshot =
  fs.readFileSync(
    "src/components/AnalysisEvidenceSnapshot.tsx",
    "utf8"
  );

const details =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceDetails.tsx",
    "utf8"
  );

const evm =
  fs.readFileSync(
    "src/components/EvmIntelligenceReport.tsx",
    "utf8"
  );

test(
  "Advanced compact view exposes a truthful visual synthesis map",
  () => {
    for (
      const marker of [
        "INVESTIGATION MAP",
        "Cross-module evidence structure",
        "Visualizes which existing evidence modules contribute",
        "AYZO SYNTHESIS",
        "Deep Funding",
        "Wallet Graph",
        "Coordination",
        "Deployer",
        "Lines do not imply ownership",
        "data-advanced-evidence-visual",
      ]
    ) {
      assert.ok(
        visual.includes(
          marker
        ),
        marker
      );
    }

    assert.equal(
      visual.includes(
        "risk score"
      ),
      false
    );
  }
);

test(
  "visual synthesis uses only existing EVM synthesis fields",
  () => {
    for (
      const marker of [
        "sourceModuleCount",
        "evidenceTransactionCount",
        ".funding",
        ".graph",
        ".coordination",
        ".deployer",
        "multiHopPathCorroborationCount",
        "verifiedDeploymentCount",
      ]
    ) {
      assert.ok(
        evm.includes(
          marker
        ),
        marker
      );
    }

    assert.ok(
      snapshot.includes(
        "<AdvancedEvidenceVisualSummary"
      )
    );
  }
);

test(
  "compact module cards gain visual hierarchy without removing evidence",
  () => {
    for (
      const marker of [
        "ModuleGlyph",
        '"asset"',
        '"activity"',
        '"funding"',
        '"graph"',
        "card.status",
        "Full list in Full Evidence",
      ]
    ) {
      assert.ok(
        snapshot.includes(
          marker
        ),
        marker
      );
    }
  }
);

test(
  "plan copy becomes a slim strip while full evidence stays preserved",
  () => {
    assert.ok(
      details.includes(
        "data-plan-evidence-strip"
      )
    );

    assert.ok(
      details.includes(
        "compact first"
      )
    );

    assert.ok(
      details.includes(
        "FULL EVIDENCE"
      )
    );

    assert.ok(
      details.includes(
        "data-full-evidence"
      )
    );

    assert.ok(
      details.includes(
        "{children}"
      )
    );
  }
);

test(
  "Wave 2 does not replace full Advanced synthesis",
  () => {
    for (
      const marker of [
        "OPEN FULL SYNTHESIS",
        "data-full-synthesis",
        "Evidence sources",
        "Evidence transactions",
        "Funding paths",
        "Graph depth",
        "Deployments",
        "Coordination signals",
      ]
    ) {
      assert.ok(
        evm.includes(
          marker
        ),
        marker
      );
    }
  }
);
