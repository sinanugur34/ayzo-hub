import assert from "node:assert/strict";
import test from "node:test";

import {
  captureProviderUsageCore,
  readProviderUsageHintsCore,
  runWithProviderUsageHintsCore,
  runWithProviderUsageScopeCore,
} from "./providerUsageScopeCore";

test(
  "collects provider events only inside one analysis scope",
  async () => {
    const result =
      await runWithProviderUsageScopeCore(
        {
          analysisId:
            "11111111-1111-4111-8111-111111111111",

          userId:
            null,

          platform:
            "web",

          planId:
            "free",

          network:
            "solana",
        },

        async () => {
          const captured =
            captureProviderUsageCore({
              provider:
                "helius",

              operation:
                "solana.signatures",

              outcome:
                "success",

              latencyMs:
                12,
            });

          assert.equal(
            captured,
            true
          );

          await Promise.resolve();

          captureProviderUsageCore({
            provider:
              "helius",

            operation:
              "solana.transaction",

            outcome:
              "rate_limited",

            latencyMs:
              8,

            httpStatus:
              429,

            errorCode:
              "RATE_LIMITED",
          });

          return 42;
        }
      );

    assert.equal(
      result.value,
      42
    );

    assert.equal(
      result.events.length,
      2
    );

    assert.equal(
      result.events[0]
        ?.analysisId,
      result.events[1]
        ?.analysisId
    );
  }
);

test(
  "provider telemetry fails open outside an analysis scope",
  () => {
    assert.equal(
      captureProviderUsageCore({
        provider:
          "alchemy",

        operation:
          "rpc",

        outcome:
          "success",
      }),
      false
    );
  }
);

test(
  "parallel analysis scopes stay isolated",
  async () => {
    const [
      left,
      right,
    ] =
      await Promise.all([
        runWithProviderUsageScopeCore(
          {
            analysisId:
              "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

            userId:
              null,

            platform:
              "web",

            planId:
              "free",

            network:
              "bitcoin",
          },

          async () => {
            captureProviderUsageCore({
              provider:
                "goldrush",

              operation:
                "history",

              outcome:
                "success",
            });

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  5
                )
            );

            captureProviderUsageCore({
              provider:
                "alchemy",

              operation:
                "canonical",

              outcome:
                "success",
            });

            return "left";
          }
        ),

        runWithProviderUsageScopeCore(
          {
            analysisId:
              "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

            userId:
              null,

            platform:
              "api",

            planId:
              "advanced",

            network:
              "ethereum",
          },

          async () => {
            captureProviderUsageCore({
              provider:
                "etherscan",

              operation:
                "transactions",

              outcome:
                "success",
            });

            return "right";
          }
        ),
      ]);

    assert.equal(
      left.events.length,
      2
    );

    assert.equal(
      right.events.length,
      1
    );

    assert.ok(
      left.events.every(
        event =>
          event.analysisId ===
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      )
    );

    assert.ok(
      right.events.every(
        event =>
          event.analysisId ===
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      )
    );
  }
);


test(
  "nested provider usage hints remain scoped",
  async () => {
    assert.equal(
      readProviderUsageHintsCore(),
      null
    );

    await runWithProviderUsageHintsCore(
      {
        attempt:
          3,

        fallbackUsed:
          true,
      },

      async () => {
        assert.deepEqual(
          readProviderUsageHintsCore(),
          {
            attempt:
              3,

            fallbackUsed:
              true,
          }
        );
      }
    );

    assert.equal(
      readProviderUsageHintsCore(),
      null
    );
  }
);
