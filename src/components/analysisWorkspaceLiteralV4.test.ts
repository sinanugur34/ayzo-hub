import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "literal workspace uses 76 rail plus 1540 main geometry",
  () => {
    const frame =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceFrame.tsx",
        "utf8"
      );

    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    const page =
      fs.readFileSync(
        "src/app/page.tsx",
        "utf8"
      );

    assert.ok(
      frame.includes(
        "styles.layout"
      )
    );

    assert.ok(
      frame.includes(
        "styles.rail"
      )
    );

    assert.ok(
      css.includes(
        "grid-template-columns: 76px minmax(0, 1fr)"
      )
    );

    assert.ok(
      css.includes(
        "max-width: 1540px"
      )
    );

    assert.ok(
      page.includes(
        "w-[calc(100vw-16px)]"
      )
    );

    assert.equal(
      page.includes(
        "relative left-1/2 mt-12 w-[min(1616px,100vw)]"
      ),
      false
    );
  }
);

test(
  "literal concept CSS keeps approved measurements",
  () => {
    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    for (
      const token
      of [
        "min-height: 112px",
        "grid-template-columns: minmax(0, 1.78fr) minmax(320px, .82fr)",
        "min-height: 495px",
        "height: 221px",
        "grid-template-columns: repeat(5, minmax(0, 1fr))",
      ]
    ) {
      assert.ok(
        css.includes(
          token
        ),
        token
      );
    }
  }
);

test(
  "activity surface uses only existing AYZO timeline evidence",
  () => {
    const source =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "timeline?.events"
      )
    );

    assert.ok(
      source.includes(
        "formattedValue"
      )
    );

    assert.ok(
      source.includes(
        "transactionHash"
      )
    );

    assert.equal(
      source.includes(
        "Binance"
      ),
      false
    );

    assert.equal(
      source.includes(
        "$60.000"
      ),
      false
    );
  }
);

test(
  "primary brief follows the literal concept information hierarchy",
  () => {
    const overview =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceOverview.tsx",
        "utf8"
      );

    for (
      const token
      of [
        "Selected item",
        "General overview",
        "Evidence overview",
        "Incoming / outgoing",
        "Evidence limit",
      ]
    ) {
      assert.ok(
        overview.includes(
          token
        ),
        token
      );
    }

    assert.equal(
      overview.includes(
        "activeCapabilities"
      ),
      false
    );
  }
);

test(
  "unavailable activity keeps concept geometry without fake evidence",
  () => {
    const activity =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceActivity.tsx",
        "utf8"
      );

    assert.ok(
      activity.includes(
        "Incoming evidence unavailable"
      )
    );

    assert.ok(
      activity.includes(
        "No comparable value series in this bounded evidence window"
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
  "relationship map uses literal node cards and curved paths",
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

    assert.ok(
      graph.includes(
        "styles.graphNode"
      )
    );

    assert.ok(
      graph.includes(
        "styles.graphEdge"
      )
    );

    assert.ok(
      graph.includes(
        "C ${source.x + dx * .47}"
      )
    );

    assert.ok(
      css.includes(
        "position: absolute"
      )
    );

    assert.equal(
      graph.includes(
        "Binance"
      ),
      false
    );

    assert.equal(
      graph.includes(
        "Kraken"
      ),
      false
    );
  }
);

test(
  "rail follows prototype desktop and mobile geometry",
  () => {
    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    assert.ok(
      css.includes(
        "grid-template-columns: 76px minmax(0, 1fr)"
      )
    );

    assert.ok(
      css.includes(
        "height: 100vh"
      )
    );

    assert.ok(
      css.includes(
        "@media (max-width: 800px)"
      )
    );

    assert.ok(
      css.includes(
        "flex-direction: row"
      )
    );
  }
);
