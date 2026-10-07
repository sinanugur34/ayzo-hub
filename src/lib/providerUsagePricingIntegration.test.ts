import assert from "node:assert/strict";
import test from "node:test";

import {
  providerUsageFetch,
} from "./providerUsageHttpCore";

import {
  runWithProviderUsageScopeCore,
} from "./providerUsageScopeCore";

const CONTEXT = {
  analysisId:
    "11111111-1111-4111-8111-111111111111",

  userId:
    null,

  platform:
    "web" as const,

  planId:
    "advanced" as const,

  network:
    "solana",
};

test(
  "Helius physical event carries provider-native units",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        CONTEXT,

        async () =>
          providerUsageFetch(
            {
              provider:
                "helius",

              operation:
                "solana.rpc.getTransaction",
            },

            "https://example.invalid",

            async () => ({
              ok:
                true,

              status:
                200,
            })
          )
      );

    const event =
      result.events[0];

    assert.ok(
      event
    );

    /*
     * Legacy physical-request semantics remain
     * unchanged.
     */
    assert.equal(
      event.estimatedUnits,
      1
    );

    assert.equal(
      event.metadata
        .native_unit_kind,
      "credit"
    );

    assert.equal(
      event.metadata
        .native_units,
      10
    );

    assert.equal(
      event.metadata
        .estimated_public_cost_usd,
      0.00005
    );

    assert.equal(
      event.metadata
        .cost_basis,
      "public_overage_equivalent"
    );

    assert.equal(
      event.metadata
        .pricing_status,
      "verified_public"
    );
  }
);

test(
  "GoldRush physical event preserves unresolved pricing truthfully",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        {
          ...CONTEXT,

          network:
            "ethereum",
        },

        async () =>
          providerUsageFetch(
            {
              provider:
                "goldrush",

              operation:
                "evm.transactions",
            },

            "https://example.invalid",

            async () => ({
              ok:
                true,

              status:
                200,
            })
          )
      );

    const event =
      result.events[0];

    assert.ok(
      event
    );

    assert.equal(
      event.metadata
        .native_unit_kind,
      "credit"
    );

    assert.equal(
      event.metadata
        .native_units,
      null
    );

    assert.equal(
      event.metadata
        .estimated_public_cost_usd,
      null
    );

    assert.equal(
      event.metadata
        .pricing_status,
      "dynamic_unresolved"
    );
  }
);
