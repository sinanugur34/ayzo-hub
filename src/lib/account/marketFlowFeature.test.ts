import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "../plans/registry";

test(
  "Market Flow Intelligence is live for Pro and Advanced only",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "marketFlowIntelligence"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "marketFlowIntelligence"
      ),
      true
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "marketFlowIntelligence"
      ),
      true
    );
  }
);

test(
  "Market Flow Intelligence is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "pro",
        "marketFlowIntelligence"
      ),
      false
    );

    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "marketFlowIntelligence"
      ),
      false
    );
  }
);
