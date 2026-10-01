import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PLANS,
} from "@/lib/plans/registry";

import {
  getAnalysisQuotaPolicy,
} from "@/lib/analysisQuotaPolicy";

const freeQuota =
  fs.readFileSync(
    "src/lib/freeQuota.ts",
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

const mobileQuota =
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
  "Free alone owns the per-network analysis cap",
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
  "Free web quota uses separate canonical network counters",
  () => {
    assert.ok(
      freeQuota.includes(
        "FREE_NETWORK_ANALYSIS_LIMIT"
      )
    );

    assert.ok(
      freeQuota.includes(
        ":network:${networkId}"
      )
    );

    assert.ok(
      webRoute.includes(
        "resolution.networkId"
      )
    );

    assert.ok(
      webRoute.includes(
        "DAILY_NETWORK_LIMIT"
      )
    );

    assert.ok(
      solanaRoute.includes(
        '"solana"'
      )
    );

    assert.ok(
      solanaRoute.includes(
        "DAILY_NETWORK_LIMIT"
      )
    );
  }
);

test(
  "Free mobile enforces network quota without adding a paid cap",
  () => {
    assert.ok(
      mobileQuota.includes(
        'plan ===\n      "free"'
      )
    );

    assert.ok(
      mobileQuota.includes(
        "networkQuotaKey"
      )
    );

    assert.ok(
      mobileRoute.includes(
        "resolution.networkId"
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
  "plan surfaces disclose Free network cap and paid absence",
  () => {
    assert.ok(
      pricing.includes(
        "Per-network analysis limit"
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
