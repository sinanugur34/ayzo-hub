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
  "reference matrix remains 72 features across 7 categories",
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
  "PricingPlans owns the shared billing-period state",
  () => {
    assert.match(
      pricing,
      /useState<BillingPeriod>/
    );

    assert.match(
      pricing,
      /billingPeriod=\{/
    );

    assert.match(
      pricing,
      /onBillingPeriodChange=\{/
    );
  }
);

test(
  "matrix supports monthly and annual comparison views",
  () => {
    assert.match(
      matrix,
      /data-ayzo-billing-period="monthly"/
    );

    assert.match(
      matrix,
      /data-ayzo-billing-period="annual"/
    );

    assert.match(
      matrix,
      /\/mo eq\./
    );

    assert.match(
      matrix,
      /billed annually/
    );
  }
);

test(
  "billing-period selection does not claim to change current subscription",
  () => {
    assert.match(
      matrix,
      /Your current subscription is unchanged/
    );
  }
);

test(
  "reference comparison controls are exposed",
  () => {
    assert.match(
      matrix,
      /Show differences only/
    );

    assert.match(
      matrix,
      /Jump to a feature category/
    );

    assert.match(
      matrix,
      /PLAN_COMPARISON_FEATURE_COUNT/
    );

    assert.match(
      matrix,
      /PLAN_COMPARISON_CATEGORY_COUNT/
    );
  }
);
