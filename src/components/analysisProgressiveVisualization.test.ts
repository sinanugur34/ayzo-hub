import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const details =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceDetails.tsx",
    "utf8"
  );

const tools =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceResearchTools.tsx",
    "utf8"
  );

const actions =
  fs.readFileSync(
    "src/components/AnalysisActions.tsx",
    "utf8"
  );

const evm =
  fs.readFileSync(
    "src/components/EvmIntelligenceReport.tsx",
    "utf8"
  );

const snapshot =
  fs.readFileSync(
    "src/components/AnalysisEvidenceSnapshot.tsx",
    "utf8"
  );

test(
  "Detailed Evidence is plan-aware and keeps full evidence available",
  () => {
    assert.match(
      details,
      /\/api\/free\/status/
    );

    assert.match(
      details,
      /data-analysis-plan/
    );

    for (
      const marker of [
        "FREE · CORE EVIDENCE",
        "PRO · RESEARCH",
        "ADVANCED · INVESTIGATION",
        "FULL EVIDENCE",
        "Nothing removed",
        "data-full-evidence",
      ]
    ) {
      assert.ok(
        details.includes(
          marker
        ),
        marker
      );
    }

    assert.ok(
      details.includes(
        "{children}"
      )
    );
  }
);

test(
  "compact snapshot uses existing evidence values and preserves drill-down language",
  () => {
    for (
      const marker of [
        "COMPACT EVIDENCE VIEW",
        "Key evidence at a glance",
        "Top Findings",
        "Evidence modules",
        "EVIDENCE PRESERVED",
        "ADVANCED INVESTIGATION SYNTHESIS",
      ]
    ) {
      assert.ok(
        snapshot.includes(
          marker
        ),
        marker
      );
    }

    assert.ok(
      evm.includes(
        "<AnalysisEvidenceSnapshot"
      )
    );

    assert.ok(
      evm.includes(
        "data.activityTimeline"
      )
    );

    assert.ok(
      evm.includes(
        "fundingSourceCount"
      )
    );

    assert.ok(
      evm.includes(
        "data.moduleSummary"
      )
    );
  }
);

test(
  "Research Tools keep primary actions visible and group deeper tools",
  () => {
    assert.ok(
      tools.includes(
        "QUICK RESEARCH ACTIONS"
      )
    );

    assert.ok(
      actions.includes(
        "OPEN FULL RESEARCH WORKSPACE"
      )
    );

    assert.ok(
      actions.includes(
        "data-full-research-workspace"
      )
    );

    for (
      const marker of [
        "SmartAlertQuickAdd",
        "CaseQuickAdd",
        "EvidenceLockerQuickAdd",
        "EntityAnnotationPanel",
        "AyzoEntityLabelsPanel",
        "AskAyzoPanel",
        "HistoricalChangesPanel",
        "InvestigationTimelinePanel",
      ]
    ) {
      assert.ok(
        actions.includes(
          marker
        ),
        marker
      );
    }
  }
);

test(
  "Advanced synthesis remains complete behind progressive disclosure",
  () => {
    assert.ok(
      evm.includes(
        "OPEN FULL SYNTHESIS"
      )
    );

    assert.ok(
      evm.includes(
        "data-full-synthesis"
      )
    );

    for (
      const marker of [
        "Evidence sources",
        "Evidence transactions",
        "Funding paths",
        "Graph depth",
        "Deployments",
        "Deployer funding sources",
        "Coordination signals",
        "Multi-hop corroborations",
        ".highlights",
        ".limitation",
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
      evm.includes(
        "no ownership, identity, intent or"
      )
    );
  }
);
