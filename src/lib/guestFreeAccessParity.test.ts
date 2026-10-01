import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  GUEST_ANALYSIS_POLICY,
} from "@/lib/guestAnalysisPolicy";

import {
  PLANS,
} from "@/lib/plans/registry";

const freeQuota =
  fs.readFileSync(
    "src/lib/freeQuota.ts",
    "utf8"
  );

const analysisQuota =
  fs.readFileSync(
    "src/lib/analysisQuota.ts",
    "utf8"
  );

const statusRoute =
  fs.readFileSync(
    "src/app/api/free/status/route.ts",
    "utf8"
  );

const webRoute =
  fs.readFileSync(
    "src/app/api/intelligence/route.ts",
    "utf8"
  );

const solanaRoute =
  fs.readFileSync(
    "src/app/api/solana/intelligence/route.ts",
    "utf8"
  );

const upfront =
  fs.readFileSync(
    "src/components/FreePlanStatus.tsx",
    "utf8"
  );

const limitCard =
  fs.readFileSync(
    "src/components/AnalysisLimitCard.tsx",
    "utf8"
  );

const pricing =
  fs.readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

const publicPlans =
  fs.readFileSync(
    "src/app/api/public/plans/route.ts",
    "utf8"
  );

test(
  "Guest receives one analysis while Free account keeps three",
  () => {
    assert.equal(
      GUEST_ANALYSIS_POLICY.limit,
      1
    );

    assert.equal(
      GUEST_ANALYSIS_POLICY.windowSeconds,
      86400
    );

    assert.equal(
      PLANS.free.analysisQuota.kind,
      "fixed"
    );

    assert.equal(
      PLANS.free.analysisQuota.count,
      3
    );

    assert.equal(
      PLANS.free.analysisQuota.perNetworkCount,
      2
    );
  }
);

test(
  "Guest uses device and IP quota while account Free uses user quota",
  () => {
    assert.ok(
      freeQuota.includes(
        "GUEST_ANALYSIS_POLICY.limit"
      )
    );

    assert.ok(
      freeQuota.includes(
        '"ip"'
      )
    );

    assert.ok(
      freeQuota.includes(
        '"device"'
      )
    );

    assert.ok(
      analysisQuota.includes(
        "if (userId)"
      )
    );

    assert.ok(
      analysisQuota.includes(
        "consumeMobileAnalysisQuota"
      )
    );
  }
);

test(
  "Guest limit is a distinct server error",
  () => {
    assert.ok(
      webRoute.includes(
        "DAILY_GUEST_LIMIT"
      )
    );

    assert.ok(
      solanaRoute.includes(
        "DAILY_GUEST_LIMIT"
      )
    );

    assert.ok(
      webRoute.includes(
        "Create a free AYZO account"
      )
    );
  }
);

test(
  "status contract distinguishes Guest from account access",
  () => {
    assert.ok(
      statusRoute.includes(
        "authenticated"
      )
    );

    assert.ok(
      statusRoute.includes(
        "accessMode"
      )
    );

    assert.ok(
      statusRoute.includes(
        "guestLimit"
      )
    );

    assert.ok(
      statusRoute.includes(
        "freeAccountLimit"
      )
    );
  }
);

test(
  "public surfaces encourage Guest users to create a Free account",
  () => {
    for (
      const source of [
        upfront,
        limitCard,
        pricing,
      ]
    ) {
      assert.ok(
        source.includes(
          "/login?mode=signup"
        )
      );
    }

    assert.ok(
      upfront.includes(
        "Create Free Account"
      )
    );

    assert.ok(
      limitCard.includes(
        "Create Free Account"
      )
    );

    assert.ok(
      publicPlans.includes(
        "guestAccess"
      )
    );

    assert.ok(
      publicPlans.includes(
        "freeAccountUpgrade"
      )
    );
  }
);
