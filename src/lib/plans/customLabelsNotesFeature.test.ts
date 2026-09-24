import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Custom Labels & Notes workspace is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "customLabelsNotes"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "customLabelsNotes"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "customLabelsNotes"
      ),
      true
    );
  }
);

test(
  "Custom Labels & Notes is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "customLabelsNotes"
      ),
      false
    );
  }
);
