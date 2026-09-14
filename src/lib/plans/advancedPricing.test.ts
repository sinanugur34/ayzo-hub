import assert from "node:assert/strict";
import test from "node:test";

import {
  PLANS,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Advanced uses individual premium pricing",
  () => {
    assert.equal(
      PLANS.advanced.monthlyPriceUsd,
      69
    );

    assert.equal(
      PLANS.advanced.annualDiscountPercent,
      20
    );

    assert.equal(
      PLANS.advanced.annualPriceUsd,
      662
    );
  }
);

test(
  "Advanced annual pricing uses whole-dollar 20 percent positioning",
  () => {
    const monthlyAnnual =
      69 *
      12;

    const annual =
      PLANS.advanced
        .annualPriceUsd;

    assert.equal(
      annual,
      662
    );

    assert.equal(
      monthlyAnnual -
        annual,
      166
    );

    assert.ok(
      annual /
        monthlyAnnual <=
        0.8
    );
  }
);

test(
  "Team Workspace is not part of individual Advanced roadmap",
  () => {
    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "teamWorkspace"
      ),
      false
    );
  }
);
