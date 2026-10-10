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

test("Retired physical provider cannot generate billable HTTP events", async () => {
  const result = await runWithProviderUsageScopeCore(
    { ...CONTEXT, network: "ethereum" },
    async () => {
      await assert.rejects(() => providerUsageFetch(
        { provider: "goldrush", operation: "evm.transactions" },
        "https://example.invalid",
        async () => ({ ok: true, status: 200 }),
      ), /AYZO_GOLDRUSH_RETIRED/);
    },
  );
  assert.equal(result.events.length, 0);
});

test(
  "Alchemy Solana physical event carries compute-unit metadata",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        CONTEXT,

        async () =>
          providerUsageFetch(
            {
              provider:
                "alchemy",

              operation:
                "solana.rpc.getTransactionsForAddress",
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
      event.estimatedUnits,
      1
    );

    assert.equal(
      event.metadata
        .native_unit_kind,
      "compute_unit"
    );

    assert.equal(
      event.metadata
        .native_units,
      100
    );

    assert.equal(
      event.metadata
        .pricing_status,
      "verified_public"
    );
  }
);
