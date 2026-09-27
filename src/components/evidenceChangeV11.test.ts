import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const historicalChanges =
  fs.readFileSync(
    "src/components/HistoricalChangesPanel.tsx",
    "utf8"
  );

const researchTools =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceResearchTools.tsx",
    "utf8"
  );

test(
  "Evidence Change publishes bounded comparison state to the workspace",
  () => {
    assert.ok(
      historicalChanges.includes(
        '"ayzo:evidence-change-summary"'
      )
    );

    assert.ok(
      historicalChanges.includes(
        'publishEvidenceChangeSummary('
      )
    );

    assert.ok(
      historicalChanges.includes(
        '"ready",'
      )
    );

    assert.ok(
      historicalChanges.includes(
        "body.comparison.changeCount"
      )
    );
  }
);

test(
  "Research Tools surfaces Evidence Change without inventing evidence",
  () => {
    assert.ok(
      researchTools.includes(
        '"ayzo:evidence-change-summary"'
      )
    );

    assert.ok(
      researchTools.includes(
        "data-evidence-change-summary"
      )
    );

    assert.ok(
      researchTools.includes(
        '"Save baseline to track change"'
      )
    );

    assert.ok(
      researchTools.includes(
        '"No evidence change"'
      )
    );

    assert.ok(
      researchTools.includes(
        '"Pro · Evidence Change"'
      )
    );
  }
);

test(
  "Evidence Change uses last-saved-analysis language",
  () => {
    assert.ok(
      historicalChanges.includes(
        "EVIDENCE CHANGE"
      )
    );

    assert.ok(
      historicalChanges.includes(
        "Since your last saved analysis"
      )
    );

    assert.ok(
      historicalChanges.includes(
        "saved baseline"
      )
    );

    assert.equal(
      historicalChanges.includes(
        "Changes since previous analysis"
      ),
      false
    );
  }
);
