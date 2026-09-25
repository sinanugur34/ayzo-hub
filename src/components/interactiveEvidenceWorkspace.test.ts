import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "interactive evidence graph exposes node and edge selection",
  () => {
    const source =
      fs.readFileSync(
        "src/components/InteractiveEvidenceGraph.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "InteractiveEvidenceSelection"
      )
    );

    assert.ok(
      source.includes(
        "selectNode"
      )
    );

    assert.ok(
      source.includes(
        "selectEdge"
      )
    );

    assert.ok(
      source.includes(
        "ayzo:evidence-selection"
      )
    );

    assert.ok(
      source.includes(
        "evidenceRefs"
      )
    );
  }
);

test(
  "workspace brief reacts to selected graph evidence",
  () => {
    const source =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceOverview.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "evidenceSelection"
      )
    );

    assert.ok(
      source.includes(
        "Selected item"
      )
    );

    assert.ok(
      source.includes(
        "Return to general overview"
      )
    );
  }
);

test(
  "activity timeline listens for selected transaction evidence",
  () => {
    const source =
      fs.readFileSync(
        "src/components/ActivityTimeline.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "ayzo:evidence-selection"
      )
    );

    assert.ok(
      source.includes(
        "selectedEvidenceSet"
      )
    );

    assert.ok(
      source.includes(
        "event.transactionHash.toLowerCase()"
      )
    );

    assert.ok(
      source.includes(
        "Matching transaction activity is highlighted below."
      )
    );
  }
);
