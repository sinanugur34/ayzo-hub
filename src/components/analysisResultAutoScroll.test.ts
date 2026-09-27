import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

test(
  "all six live-network result surfaces expose the result anchor",
  () => {
    const anchors =
      page.match(
        /id="analysis-result"/g
      ) ?? [];

    assert.equal(
      anchors.length,
      6
    );

    for (
      const state of [
        "solanaResult",
        "evmAnalysis",
        "bitcoinAnalysis",
        "dogecoinAnalysis",
        "tronAnalysis",
        "xrpAnalysis",
      ]
    ) {
      const pattern =
        new RegExp(
          `\\{${state}\\s*&&\\s*\\([\\s\\S]*?id="analysis-result"`
        );

      assert.match(
        page,
        pattern
      );
    }
  }
);

test(
  "successful analysis scrolls result workspace into view",
  () => {
    assert.match(
      page,
      /document\.getElementById\(\s*"analysis-result"\s*\)/
    );

    assert.match(
      page,
      /target\.scrollIntoView\(\{/
    );

    assert.match(
      page,
      /block:\s*"start"/
    );
  }
);

test(
  "result scrolling respects reduced-motion preference",
  () => {
    assert.match(
      page,
      /prefers-reduced-motion:\s*reduce/
    );

    assert.match(
      page,
      /reduceMotion\s*\?\s*"auto"\s*:\s*"smooth"/
    );
  }
);

test(
  "animation frame is cancelled during effect cleanup",
  () => {
    assert.match(
      page,
      /window\.requestAnimationFrame/
    );

    assert.match(
      page,
      /window\.cancelAnimationFrame/
    );
  }
);
