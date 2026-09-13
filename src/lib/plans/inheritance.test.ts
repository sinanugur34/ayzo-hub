import assert from "node:assert/strict";
import test from "node:test";

import {
  PLANS,
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

test(
  "Advanced inherits every live Pro feature",
  () => {
    const proFeatures =
      Object.entries(
        PLANS.pro.features
      )
        .filter(
          ([, enabled]) =>
            enabled === true
        )
        .map(
          ([feature]) =>
            feature
        );

    for (
      const feature
      of proFeatures
    ) {
      assert.equal(
        planHasFeature(
          "advanced",
          feature as keyof typeof PLANS.pro.features
        ),
        true,
        `Advanced must inherit Pro feature: ${feature}`
      );
    }
  }
);

test(
  "Advanced inherits every Pro roadmap feature",
  () => {
    for (
      const feature
      of PLANS.pro.roadmapFeatures
    ) {
      assert.equal(
        planHasRoadmapFeature(
          "advanced",
          feature
        ),
        true,
        `Advanced must inherit Pro roadmap feature: ${feature}`
      );
    }
  }
);
