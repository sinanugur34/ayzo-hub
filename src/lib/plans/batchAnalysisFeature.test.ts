import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Batch Analysis is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "batchAnalysis"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "batchAnalysis"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "batchAnalysis"
      ),
      true
    );
  }
);

test(
  "Batch Analysis is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "batchAnalysis"
      ),
      false
    );
  }
);
