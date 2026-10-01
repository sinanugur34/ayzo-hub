import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PLANS,
} from "@/lib/plans/registry";

import {
  getAnalysisQuotaPolicy,
} from "@/lib/analysisQuotaPolicy";

const analysisQuota =
  fs.readFileSync(
    "src/lib/analysisQuota.ts",
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

const accountQuota =
  fs.readFileSync(
    "src/lib/account/mobileAnalysisQuota.ts",
    "utf8"
  );

const mobileRoute =
  fs.readFileSync(
    "src/app/api/mobile/intelligence/route.ts",
    "utf8"
  );

const pricing =
  fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

const upfront =
  fs.readFileSync(
    "src/components/FreePlanStatus.tsx",
    "utf8"
  );

test(
  "signed-in Free alone owns the per-network analysis cap",
  () => {
    assert.equal(
      PLANS.free
        .analysisQuota.kind,
      "fixed"
    );

    assert.equal(
      PLANS.free
        .analysisQuota
        .perNetworkCount,
      2
    );

    assert.equal(
      PLANS.pro
        .analysisQuota
        .perNetworkCount,
      null
    );

    assert.equal(
      PLANS.advanced
        .analysisQuota
        .perNetworkCount,
      null
    );

    assert.equal(
      getAnalysisQuotaPolicy(
        "free"
      ).perNetworkLimit,
      2
    );

    assert.equal(
      getAnalysisQuotaPolicy(
        "pro"
      ).perNetworkLimit,
      null
    );

    assert.equal(
      getAnalysisQuotaPolicy(
        "advanced"
      ).perNetworkLimit,
      null
    );
  }
);

test(
  "signed-in Free web and mobile share user-scoped network counters",
  () => {
    assert.ok(
      analysisQuota.includes(
        "getMobileAnalysisQuotaStatus"
      )
    );

    assert.ok(
      analysisQuota.includes(
        "consumeMobileAnalysisQuota"
      )
    );

    assert.ok(
      accountQuota.includes(
        "networkQuotaKey"
      )
    );

    assert.ok(
      accountQuota.includes(
        "mobile-free-quota"
      )
    );

    assert.ok(
      webRoute.includes(
        "DAILY_NETWORK_LIMIT"
      )
    );

    assert.ok(
      solanaRoute.includes(
        "DAILY_NETWORK_LIMIT"
      )
    );

    assert.ok(
      mobileRoute.includes(
        "DAILY_NETWORK_LIMIT"
      )
    );
  }
);

test(
  "Guest does not consume the signed-in Free per-network counter",
  () => {
    assert.ok(
      analysisQuota.includes(
        "getFreeQuotaStatus(\n      request,\n      null"
      )
    );

    assert.ok(
      analysisQuota.includes(
        "consumeFreeAnalysis(\n      request,\n      null"
      )
    );

    assert.ok(
      analysisQuota.includes(
        "networkLimit:\n      null"
      )
    );
  }
);

test(
  "plan surfaces disclose signed-in Free network cap and paid absence",
  () => {
    assert.ok(
      pricing.includes(
        "signed-in Free accounts"
      )
    );

    assert.ok(
      pricing.includes(
        "No limit"
      )
    );

    assert.ok(
      upfront.includes(
        "No per-network analysis limit"
      )
    );

    assert.ok(
      upfront.includes(
        "same-network analyses remaining"
      )
    );
  }
);
