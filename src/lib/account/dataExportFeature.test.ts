import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "../plans/registry";

test(
  "Data Export is live for Pro and Advanced only",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "dataExport"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "dataExport"
      ),
      true
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "dataExport"
      ),
      true
    );
  }
);

test(
  "Data Export is no longer roadmap-only",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "pro",
        "dataExport"
      ),
      false
    );

    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "dataExport"
      ),
      false
    );
  }
);
