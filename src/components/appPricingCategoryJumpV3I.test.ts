import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const matrix =
  readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

test(
  "exactly two responsive pricing category targets remain",
  () => {
    const targets =
      matrix.match(
        /data-ayzo-plan-category\s*=\s*\{/g
      ) ?? [];

    assert.equal(
      targets.length,
      2
    );
  }
);

test(
  "category jump enumerates responsive matches",
  () => {
    assert.match(
      matrix,
      /document\.querySelectorAll</
    );

    assert.doesNotMatch(
      matrix,
      /const target\s*=\s*document\.querySelector</
    );
  }
);

test(
  "category jump chooses a visible rendered target",
  () => {
    assert.match(
      matrix,
      /candidates\.find/
    );

    assert.match(
      matrix,
      /window\.getComputedStyle/
    );

    assert.match(
      matrix,
      /style\.display !==\s*"none"/
    );

    assert.match(
      matrix,
      /style\.visibility !==\s*"hidden"/
    );

    assert.match(
      matrix,
      /rect\.width >\s*0/
    );

    assert.match(
      matrix,
      /rect\.height >\s*0/
    );
  }
);

test(
  "category jump keeps smooth start-aligned scrolling",
  () => {
    assert.match(
      matrix,
      /target\?\.scrollIntoView/
    );

    assert.match(
      matrix,
      /behavior:\s*"smooth"/
    );

    assert.match(
      matrix,
      /block:\s*"start"/
    );
  }
);
