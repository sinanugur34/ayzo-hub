import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

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

const checkout =
  readFileSync(
    "src/components/billing/PlanCheckoutButton.tsx",
    "utf8"
  );

test(
  "shared billing state reaches cards and matrix",
  () => {
    assert.match(
      pricing,
      /<PricingPlanCards[\s\S]*?billingPeriod=\{/
    );

    assert.match(
      pricing,
      /<PlanComparisonMatrix[\s\S]*?billingPeriod=\{/
    );
  }
);

test(
  "plan cards expose monthly and annual checkout paths",
  () => {
    assert.match(
      cards,
      /interval="monthly"/
    );

    assert.match(
      cards,
      /interval="annual"/
    );

    assert.match(
      cards,
      /billingPeriod ===\s*"monthly"/
    );

    assert.match(
      cards,
      /billingPeriod ===\s*"annual"/
    );
  }
);

test(
  "real checkout component remains unchanged in responsibility",
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
