import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Evidence Locker is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "evidenceLocker"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "evidenceLocker"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "evidenceLocker"
      ),
      true
    );
  }
);

test(
  "Evidence Locker is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "evidenceLocker"
      ),
      false
    );
  }
);
