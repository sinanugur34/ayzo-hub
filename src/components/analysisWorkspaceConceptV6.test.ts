import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "v6 unavailable map preserves concept density without fake entities",
  () => {
    const graph =
      fs.readFileSync(
        "src/components/InteractiveEvidenceGraph.tsx",
        "utf8"
      );

    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    for (
      const token
      of [
        "graphGhostSourceA",
        "graphGhostSourceB",
        "graphGhostTargetA",
        "graphGhostTargetB",
        "graphGhostTargetC",
        "Layout placeholders only",
      ]
    ) {
      assert.ok(
        graph.includes(token),
        token
      );
    }

    assert.ok(
      css.includes(
        "left: 12%"
      )
    );

    assert.ok(
      css.includes(
        "left: 85%"
      )
    );

    assert.equal(
      graph.includes("Binance"),
      false
    );

    assert.equal(
      graph.includes("Kraken"),
      false
    );

    assert.equal(
      graph.includes("$60.000"),
      false
    );
  }
);

test(
  "v6 unavailable activity keeps five-row and five-event concept geometry",
  () => {
    const activity =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    assert.ok(
      activity.includes(
        "Additional flow evidence unavailable"
      )
    );

    assert.ok(
      activity.includes(
        "length:"
      )
    );

    assert.ok(
      activity.includes(
        "5,"
      )
    );

    assert.ok(
      activity.includes(
        "No event"
      )
    );

    assert.equal(
      activity.includes(
        "Binance"
      ),
      false
    );
  }
);

test(
  "v6 secondary technical surfaces remain available but visually compact",
  () => {
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

    assert.ok(
      details.includes(
        "DETAILED EVIDENCE"
      )
    );

    assert.ok(
      details.includes(
        "px-4 py-3"
      )
    );

    assert.ok(
      tools.includes(
        "RESEARCH TOOLS"
      )
    );

    assert.ok(
      tools.includes(
        "px-4 py-3"
      )
    );
  }
);

test(
  "v6 flow chart uses full bounded timeline while list remains capped at five",
  () => {
    const activity =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    assert.ok(
      activity.includes(
        "const timelineEvents ="
      )
    );

    assert.ok(
      activity.includes(
        "timelineEvents.slice("
      )
    );

    assert.ok(
      activity.includes(
        "const chartValuedEvents ="
      )
    );

    assert.ok(
      activity.includes(
        "timelineEvents.filter("
      )
    );

    assert.ok(
      activity.includes(
        "const chartEvents ="
      )
    );

    assert.ok(
      activity.includes(
        "chartValuedEvents"
      )
    );
  }
);


test(
  "v6 flow chart explains full bounded evidence scope",
  () => {
    const activity =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    assert.ok(
      activity.includes(
        "across the full bounded timeline"
      )
    );

    assert.ok(
      activity.includes(
        "valued event(s) from"
      )
    );

    assert.ok(
      activity.includes(
        "bounded record(s)"
      )
    );
  }
);
