import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Compare Investigations is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "compareInvestigations"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "compareInvestigations"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "compareInvestigations"
      ),
      true
    );
  }
);

test(
  "Compare Investigations is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "compareInvestigations"
      ),
      false
    );
  }
);
