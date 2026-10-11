import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  PLAN_COMPARISON_CATEGORY_COUNT,
  PLAN_COMPARISON_FEATURE_COUNT,
} from "@/components/PlanComparisonMatrix";

import {
  PLANS,
} from "@/lib/plans/registry";

const pricing =
  readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

const cards =
  readFileSync(
    "src/components/PricingPlanCards.tsx",
    "utf8"
  );

const matrix =
  readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

test(
  "canonical paid-plan prices remain registry-owned",
  () => {
    assert.equal(
      PLANS.pro.monthlyPriceUsd,
      19
    );

    assert.equal(
      PLANS.pro.annualPriceUsd,
      193.8
    );

    assert.equal(
      PLANS.advanced.monthlyPriceUsd,
      69
    );

    assert.equal(
      PLANS.advanced.annualPriceUsd,
      662
    );
  }
);

test(
  "comparison remains 72 features across 7 categories",
  () => {
    assert.equal(
      PLAN_COMPARISON_FEATURE_COUNT,
      72
    );

    assert.equal(
      PLAN_COMPARISON_CATEGORY_COUNT,
      7
    );
  }
);

test(
  "PricingPlans owns shared billing-period state",
  () => {
    assert.match(
      pricing,
      /useState<BillingPeriod>/
    );

    assert.match(
      pricing,
      /<PricingPlanCards/
    );

    assert.match(
      pricing,
      /onBillingPeriodChange=\{/
    );
  }
);

test(
  "plan cards own billing controls",
  () => {
    assert.match(
      cards,
      /data-ayzo-billing-period="monthly"/
    );

    assert.match(
      cards,
      /data-ayzo-billing-period="annual"/
    );

    assert.match(
      cards,
      /\/mo eq\./
    );

    assert.match(
      cards,
      /billed annually/
    );
  }
);

test(
  "matrix remains period-aware without owning billing switch",
  () => {
    assert.match(
      matrix,
      /billingPeriod/
    );

    assert.doesNotMatch(
      matrix,
      /data-ayzo-billing-period/
    );
  }
);
