import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "analysis workspace blends smoothly from the hero background",
  () => {
    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    assert.ok(
      css.includes(
        "#050506 0"
      )
    );

    assert.ok(
      css.includes(
        "#080f1d 132px"
      )
    );

    assert.ok(
      css.includes(
        "#0a1424 132px"
      )
    );

    assert.ok(
      css.includes(
        "linear-gradient("
      )
    );

    assert.equal(
      css.includes(
        "background: #080f1d;"
      ),
      false
    );

    assert.equal(
      css.includes(
        "background: #0a1424;"
      ),
      false
    );
  }
);

test(
  "workspace header keeps a stable content axis",
  () => {
    const css =
      fs.readFileSync(
        "src/components/AnalysisWorkspaceConcept.module.css",
        "utf8"
      );

    assert.ok(
      css.includes(
        "width: 100%;"
      )
    );

    assert.ok(
      css.includes(
        "margin: 0;"
      )
    );

    assert.ok(
      css.includes(
        "padding: 0;"
      )
    );
  }
);
