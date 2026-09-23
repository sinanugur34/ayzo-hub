import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Cases is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "cases"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "cases"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "cases"
      ),
      true
    );
  }
);

test(
  "Cases is no longer Advanced roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "cases"
      ),
      false
    );
  }
);
