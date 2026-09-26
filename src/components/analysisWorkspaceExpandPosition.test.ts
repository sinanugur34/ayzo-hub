import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const files = [
  "src/components/AnalysisWorkspaceDetails.tsx",
  "src/components/AnalysisWorkspaceResearchTools.tsx",
];

test(
  "expandable workspace panels move their heading into view when opened",
  () => {
    for (
      const file
      of files
    ) {
      const source =
        fs.readFileSync(
          file,
          "utf8"
        );

      assert.ok(
        source.includes(
          '"use client"'
        ),
        file
      );

      assert.ok(
        source.includes(
          "useRef<HTMLDetailsElement>"
        ),
        file
      );

      assert.ok(
        source.includes(
          "onToggle={handleToggle}"
        ),
        file
      );

      assert.ok(
        source.includes(
          "node.scrollIntoView({"
        ),
        file
      );

      assert.ok(
        source.includes(
          '"smooth"'
        ),
        file
      );

      assert.ok(
        source.includes(
          '"start"'
        ),
        file
      );

      assert.ok(
        source.includes(
          "if (!node?.open)"
        ),
        file
      );
    }
  }
);
