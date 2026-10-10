import assert from "node:assert/strict";
import test from "node:test";

import {
  providerUsageFetch,
} from "./providerUsageHttpCore";

import {
  runWithProviderUsageHintsCore,
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
    "ethereum",
};

test(
  "records lightweight response-compatible objects",
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
                "evm.rpc.eth_blockNumber",
            },

            "https://example.invalid",

            async () => ({
              ok:
                true,

              status:
                200,

              json:
                async () => ({
                  result:
                    "0x1",
                }),
            })
          )
      );

    assert.equal(
      result.events.length,
      1
    );

    assert.equal(
      result.events[0]?.provider,
      "alchemy"
    );

    assert.equal(
      result.events[0]?.outcome,
      "success"
    );
  }
);

test(
  "propagates fallback hint",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        CONTEXT,

        async () =>
          runWithProviderUsageHintsCore(
            {
              fallbackUsed:
                true,
            },

            async () =>
              providerUsageFetch(
                {
                  provider:
                    "etherscan",

                  operation:
                    "evm.transactions",
                },

                "https://example.invalid",

                async () => ({
                  ok:
                    false,

                  status:
                    429,
                })
              )
          )
      );

    assert.equal(
      result.events[0]
        ?.fallbackUsed,
      true
    );

    assert.equal(
      result.events[0]
        ?.outcome,
      "rate_limited"
    );
  }
);

test(
  "records AbortError as timeout",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        CONTEXT,

        async () => {
          await assert.rejects(
            () =>
              providerUsageFetch(
                {
                  provider:
                    "etherscan",

                  operation:
                    "evm.transactions",
                },

                "https://example.invalid",

                async () => {
                  const error =
                    new Error(
                      "aborted"
                    );

                  error.name =
                    "AbortError";

                  throw error;
                }
              )
          );
        }
      );

    assert.equal(
      result.events[0]
        ?.outcome,
      "timeout"
    );
  }
);
