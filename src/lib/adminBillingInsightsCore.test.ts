import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminBillingInsights,
} from "./adminBillingInsightsCore";

test(
  "builds billing insight totals",
  () => {
    const result =
      buildAdminBillingInsights([
        {
          metric:
            "active_subscriptions",
          value:
            "10",
        },
        {
          metric:
            "pro",
          value:
            7,
        },
        {
          metric:
            "advanced",
          value:
            3,
        },
        {
          metric:
            "google_play",
          value:
            4,
        },
        {
          metric:
            "creem",
          value:
            6,
        },
        {
          metric:
            "mrr_equivalent_usd_cents",
          value:
            25900,
        },
      ]);

    assert.equal(
      result.activeSubscriptions,
      10
    );

    assert.equal(
      result.pro,
      7
    );

    assert.equal(
      result.advanced,
      3
    );

    assert.equal(
      result.googlePlay,
      4
    );

    assert.equal(
      result.creem,
      6
    );

    assert.equal(
      result.mrrEquivalentUsdCents,
      25900
    );
  }
);

test(
  "fails safe for malformed values",
  () => {
    const result =
      buildAdminBillingInsights([
        {
          metric:
            "pro",
          value:
            "bad",
        },
      ]);

    assert.equal(
      result.pro,
      0
    );
  }
);
