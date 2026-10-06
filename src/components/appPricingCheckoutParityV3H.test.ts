import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  PLANS,
} from "@/lib/plans/registry";

const pricing =
  readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

const checkout =
  readFileSync(
    "src/components/billing/PlanCheckoutButton.tsx",
    "utf8"
  );

test(
  "canonical prices remain registry-owned",
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
  "paid plan cards use the shared billing period",
  () => {
    assert.match(
      pricing,
      /paidPlanDisplayPrice/
    );

    assert.match(
      pricing,
      /paidPlanPriceSuffix/
    );

    assert.match(
      pricing,
      /paidPlanChargeLabel/
    );

    assert.match(
      pricing,
      /\/mo eq\./
    );

    assert.match(
      pricing,
      /billed annually/
    );
  }
);

test(
  "monthly checkout CTAs render only in monthly view",
  () => {
    const matches =
      pricing.match(
        /billingPeriod === "monthly" && \(/g
      ) ?? [];

    assert.equal(
      matches.length,
      2
    );
  }
);

test(
  "annual checkout CTAs render only in annual view",
  () => {
    const matches =
      pricing.match(
        /billingPeriod === "annual" && \(/g
      ) ?? [];

    assert.equal(
      matches.length,
      2
    );
  }
);

test(
  "all four canonical checkout definitions remain explicit",
  () => {
    assert.match(
      pricing,
      /plan="pro"[\s\S]*?interval="monthly"/
    );

    assert.match(
      pricing,
      /plan="pro"[\s\S]*?interval="annual"/
    );

    assert.match(
      pricing,
      /plan="advanced"[\s\S]*?interval="monthly"/
    );

    assert.match(
      pricing,
      /plan="advanced"[\s\S]*?interval="annual"/
    );
  }
);

test(
  "checkout implementation still submits plan and interval to billing API",
  () => {
    assert.match(
      checkout,
      /\/api\/billing\/checkout/
    );

    assert.match(
      checkout,
      /plan/
    );

    assert.match(
      checkout,
      /interval/
    );
  }
);
