import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const pricing =
  readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

test(
  "pricing comparison remains closed by default",
  () => {
    assert.match(
      pricing,
      /<details[\s\S]*?data-ayzo-plan-comparison="true"/
    );

    assert.doesNotMatch(
      pricing,
      /<details[^>]*\sopen(?:=|>)/m
    );
  }
);

test(
  "comparison disclosure exposes explicit open and close states",
  () => {
    assert.match(
      pricing,
      /data-ayzo-comparison-action="open"/
    );

    assert.match(
      pricing,
      /Open comparison ↓/
    );

    assert.match(
      pricing,
      /group-open:hidden/
    );

    assert.match(
      pricing,
      /data-ayzo-comparison-action="close"/
    );

    assert.match(
      pricing,
      /Close comparison ↑/
    );

    assert.match(
      pricing,
      /hidden group-open:inline/
    );
  }
);

test(
  "details element provides group-open state to its descendants",
  () => {
    assert.match(
      pricing,
      /data-ayzo-plan-comparison="true"[\s\S]*?className="group /
    );
  }
);

test(
  "comparison metadata uses concise mobile-friendly copy",
  () => {
    assert.match(
      pricing,
      /full plan details/
    );

    assert.doesNotMatch(
      pricing,
      /full plan-access detail/
    );

    assert.match(
      pricing,
      /PLAN_COMPARISON_FEATURE_COUNT/
    );

    assert.match(
      pricing,
      /PLAN_COMPARISON_CATEGORY_COUNT/
    );
  }
);
