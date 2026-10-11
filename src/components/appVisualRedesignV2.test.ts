import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const graph =
  fs.readFileSync(
    "src/components/InteractiveEvidenceGraph.tsx",
    "utf8"
  );

const overview =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceOverview.tsx",
    "utf8"
  );

const activity =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceActivity.tsx",
    "utf8"
  );

const styles =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceConcept.module.css",
    "utf8"
  );

test(
  "V2A approved evidence palette is installed",
  () => {
    assert.match(
      styles,
      /AYZO APP VISUAL V2A — EVIDENCE WORKSPACE/
    );

    assert.match(
      styles,
      /#0b1020/
    );

    assert.match(
      styles,
      /#151e30/
    );

    assert.match(
      styles,
      /#2c3952/
    );

    assert.match(
      styles,
      /#baa7ff/
    );

    assert.match(
      styles,
      /#a8fcdb/
    );
  }
);

test(
  "graph continues to render only supplied evidence nodes and edges",
  () => {
    assert.match(
      graph,
      /graph\.edges\.map/
    );

    assert.match(
      graph,
      /graph\.nodes\.map/
    );

    assert.match(
      graph,
      /graph\.status ===/
    );

    assert.doesNotMatch(
      graph,
      /const fakeEdges/
    );

    assert.doesNotMatch(
      graph,
      /const fakeNodes/
    );
  }
);

test(
  "unavailable graph explicitly rejects inferred relationships",
  () => {
    assert.match(
      graph,
      /Layout placeholders only — no relationship is inferred without observed transaction evidence\./
    );

    assert.match(
      graph,
      /Connection ≠ common ownership/
    );
  }
);

test(
  "graph interaction remains evidence backed",
  () => {
    assert.match(
      graph,
      /evidenceRefs/
    );

    assert.match(
      graph,
      /evidenceCount/
    );

    assert.match(
      graph,
      /ayzo:evidence-selection/
    );

    assert.match(
      graph,
      /onSelectionChange/
    );
  }
);

test(
  "evidence inspector still derives from findings coverage and selection",
  () => {
    assert.match(
      overview,
      /const observations =\s*findings\.slice/
    );

    assert.match(
      overview,
      /evidenceSelection/
    );

    assert.match(
      overview,
      /coverageCopy/
    );

    assert.match(
      overview,
      /Connection/
    );
  }
);

test(
  "activity and timeline continue to derive from real timeline events",
  () => {
    assert.match(
      activity,
      /timeline\?\.events/
    );

    assert.match(
      activity,
      /event\.transactionHash/
    );

    assert.match(
      activity,
      /ayzo:evidence-selection/
    );

    assert.match(
      activity,
      /Only evidence already collected by AYZO is shown/
    );
  }
);

test(
  "SVG relationship markers use approved visual accents",
  () => {
    assert.match(
      graph,
      /fill="#a8fcdb"/
    );

    assert.match(
      graph,
      /fill="#baa7ff"/
    );

    assert.match(
      graph,
      /fill="#64738f"/
    );
  }
);

test(
  "fine graph UI includes touch focus and reduced motion protection",
  () => {
    assert.match(
      styles,
      /\.graphNode:focus-visible/
    );

    assert.match(
      styles,
      /\.graphEdge:focus-visible/
    );

    assert.match(
      styles,
      /min-height:\s*44px/
    );

    assert.match(
      styles,
      /prefers-reduced-motion/
    );
  }
);
