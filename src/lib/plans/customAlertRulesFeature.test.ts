import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Custom Alert Rules is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "customAlertRules"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "customAlertRules"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "customAlertRules"
      ),
      true
    );
  }
);

test(
  "Custom Alert Rules is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "customAlertRules"
      ),
      false
    );
  }
);
