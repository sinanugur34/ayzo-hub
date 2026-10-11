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

const matrix =
  readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

test(
  "plan cards precede comparison disclosure and matrix",
  () => {
    const cardsIndex =
      pricing.indexOf(
        "<PricingPlanCards"
      );

    const disclosureIndex =
      pricing.indexOf(
        'data-ayzo-plan-comparison="true"'
      );

    const matrixIndex =
      pricing.indexOf(
        "<PlanComparisonMatrix",
        disclosureIndex
      );

    assert.ok(
      cardsIndex >= 0
    );

    assert.ok(
      disclosureIndex >
        cardsIndex
    );

    assert.ok(
      matrixIndex >
        disclosureIndex
    );
  }
);

test(
  "comparison is closed by default",
  () => {
    assert.match(
      pricing,
      /<details[\s\S]*?data-ayzo-plan-comparison="true"/
    );

    assert.match(
      pricing,
      /Compare key features/
    );

    assert.doesNotMatch(
      pricing,
      /<details[^>]*\sopen(?:=|>)/m
    );
  }
);

test(
  "plan hierarchy copy is present",
  () => {
    for (
      const token
      of [
        "YOUR RESEARCH, YOUR PACE",
        "Choose how you investigate.",
        "START HERE",
        "REGULAR RESEARCH",
        "INVESTIGATION WORKFLOWS",
      ]
    ) {
      assert.match(
        cards,
        new RegExp(
          token.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
        )
      );
    }
  }
);

test(
  "key plan summaries are present",
  () => {
    for (
      const token
      of [
        "Funding & wallet relationships",
        "Visual evidence graph",
        "Saved analyses with an account",
        "Historical changes",
        "Smart Alerts & Monitoring",
        "Ask AYZO Investigator",
        "Everything in Pro",
        "Cases & Evidence Locker",
        "Comparison & batch analysis",
        "API & custom dashboards",
        "Priority analysis",
      ]
    ) {
      assert.match(
        cards,
        new RegExp(
          token.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
        )
      );
    }
  }
);

test(
  "live network count is registry-derived",
  () => {
    assert.match(
      cards,
      /Object\.values\(\s*NETWORKS/
    );

    assert.match(
      cards,
      /network\.status ===\s*"live"/
    );

    assert.match(
      cards,
      /LIVE_NETWORK_COUNT/
    );

    assert.doesNotMatch(
      cards,
      />30 live networks</
    );
  }
);

test(
  "billing switch belongs to plan cards",
  () => {
    assert.match(
      cards,
      /data-ayzo-billing-period="monthly"/
    );

    assert.match(
      cards,
      /data-ayzo-billing-period="annual"/
    );

    assert.doesNotMatch(
      matrix,
      /data-ayzo-billing-period/
    );
  }
);
