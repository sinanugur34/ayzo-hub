import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "../plans/registry";

test(
  "Advanced Reports is live for Pro and Advanced only",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "advancedReports"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "advancedReports"
      ),
      true
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "advancedReports"
      ),
      true
    );
  }
);

test(
  "Advanced Reports is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "pro",
        "advancedReports"
      ),
      false
    );

    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "advancedReports"
      ),
      false
    );
  }
);
