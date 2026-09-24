import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Advanced Watchlists is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "advancedWatchlists"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "advancedWatchlists"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "advancedWatchlists"
      ),
      true
    );
  }
);

test(
  "Advanced Watchlists is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "advancedWatchlists"
      ),
      false
    );
  }
);
