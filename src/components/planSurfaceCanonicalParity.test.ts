import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PLANS,
} from "../lib/plans/registry";

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

const pricing =
  fs.readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

const matrix =
  fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/components/account/AccountPlanExperience.tsx",
    "utf8"
  );

const accountCard =
  fs.readFileSync(
    "src/components/account/AccountPlanCard.tsx",
    "utf8"
  );

const limit =
  fs.readFileSync(
    "src/components/AnalysisLimitCard.tsx",
    "utf8"
  );

const overview =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceOverview.tsx",
    "utf8"
  );

test(
  "Pricing derives paid prices from canonical PLANS",
  () => {
    assert.ok(
      pricing.includes(
        "PLANS.pro.monthlyPriceUsd"
      )
    );

    assert.ok(
      pricing.includes(
        "PLANS.pro.annualPriceUsd"
      )
    );

    assert.ok(
      pricing.includes(
        "PLANS.advanced.monthlyPriceUsd"
      )
    );

    assert.ok(
      pricing.includes(
        "PLANS.advanced.annualPriceUsd"
      )
    );
  }
);

test(
  "Pricing comparison derives quotas from canonical PLANS",
  () => {
    for (
      const plan of [
        "free",
        "pro",
        "advanced",
      ]
    ) {
      assert.ok(
        matrix.includes(
          `PLANS.${plan}.analysisQuota`
        )
      );
    }
  }
);

test(
  "Pricing network coverage comes from canonical network registry",
  () => {
    assert.ok(
      matrix.includes(
        'from "@/lib/networks/registry"'
      )
    );

    assert.ok(
      matrix.includes(
        "LIVE_NETWORK_COUNT"
      )
    );

    assert.equal(
      matrix.includes(
        '"17 networks"'
      ),
      false
    );

    assert.equal(
      matrix.includes(
        '"AYZO currently supports 17 live networks."'
      ),
      false
    );
  }
);

test(
  "Account plan experience stays registry-derived",
  () => {
    assert.ok(
      account.includes(
        "getPlan"
      )
    );

    assert.ok(
      account.includes(
        "planHasFeature"
      )
    );

    assert.ok(
      account.includes(
        "planHasRoadmapFeature"
      )
    );

    assert.ok(
      accountCard.includes(
        "PLANS.pro.monthlyPriceUsd"
      )
    );

    assert.ok(
      accountCard.includes(
        "PLANS.advanced.monthlyPriceUsd"
      )
    );
  }
);

test(
  "Analysis limit experience derives all plan quotas from PLANS",
  () => {
    assert.ok(
      limit.includes(
        "PLANS"
      )
    );

    for (
      const plan of [
        "free",
        "pro",
        "advanced",
      ]
    ) {
      assert.ok(
        limit.includes(
          plan
        )
      );
    }
  }
);

test(
  "Analysis workspace retains Free Pro Advanced tier language",
  () => {
    for (
      const plan of [
        "free",
        "pro",
        "advanced",
      ]
    ) {
      assert.ok(
        overview.includes(
          plan
        )
      );
    }
  }
);

test(
  "canonical quotas and paid pricing remain unchanged",
  () => {
    assert.equal(
      PLANS.free.analysisQuota.kind,
      "fixed"
    );

    assert.equal(
      PLANS.free.analysisQuota.count,
      3
    );

    assert.equal(
      PLANS.pro.analysisQuota.kind,
      "fixed"
    );

    assert.equal(
      PLANS.pro.analysisQuota.count,
      25
    );

    assert.equal(
      PLANS.advanced.analysisQuota.kind,
      "fixed"
    );

    assert.equal(
      PLANS.advanced.analysisQuota.count,
      90
    );

    assert.equal(
      PLANS.free.monthlyPriceUsd,
      0
    );

    assert.equal(
      PLANS.pro.monthlyPriceUsd,
      19
    );

    assert.equal(
      PLANS.pro.annualPriceUsd,
      193.8
    );

    assert.equal(
      PLANS.pro.annualDiscountPercent,
      15
    );

    assert.equal(
      PLANS.pro.foundingPrice,
      true
    );

    assert.equal(
      PLANS.advanced.monthlyPriceUsd,
      69
    );

    assert.equal(
      PLANS.advanced.annualPriceUsd,
      662
    );

    assert.equal(
      PLANS.advanced.annualDiscountPercent,
      20
    );

    assert.equal(
      PLANS.advanced.foundingPrice,
      false
    );
  }
);

test(
  "Mobile App remains the canonical paid roadmap item",
  () => {
    assert.ok(
      registry.includes(
        'const PRO_ROADMAP_FEATURES = ['
      )
    );

    assert.ok(
      registry.includes(
        '"mobileApp"'
      )
    );
  }
);
