import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

test(
  "all eight result-engine surfaces expose the result anchor",
  () => {
    const anchors =
      page.match(
        /id="analysis-result"/g
      ) ?? [];

    assert.equal(
      anchors.length,
      8
    );

    for (
      const state of [
        "solanaResult",
        "evmAnalysis",
        "bitcoinAnalysis",
        "dogecoinAnalysis",
        "litecoinAnalysis",
        "suiAnalysis",
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
  "successful analysis scrolls browser viewport to the result workspace",
  () => {
    assert.match(
      page,
      /document\.getElementById\(\s*"analysis-result"\s*\)/
    );

    assert.match(
      page,
      /target\.getBoundingClientRect\(\)/
    );

    assert.match(
      page,
      /window\.scrollY/
    );

    assert.match(
      page,
      /window\.scrollTo\(\{/
    );

    assert.doesNotMatch(
      page,
      /scrollIntoView\(/
    );
  }
);

test(
  "analysis submit releases focused input before viewport movement",
  () => {
    assert.match(
      page,
      /document\.activeElement/
    );

    assert.match(
      page,
      /activeElement\.blur\(\)/
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
