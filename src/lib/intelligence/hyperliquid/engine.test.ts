import assert from "node:assert/strict";
import test from "node:test";

import {
  runHyperliquidIntelligence,
  type HyperliquidEngineDependencies,
} from "./engine";

const ADDRESS =
  "0x1111111111111111111111111111111111111111";

const deps:
  HyperliquidEngineDependencies = {
    async loadEvidence(
      input
    ) {
      return {
        ok:
          true,

        latencyMs:
          1,

        data: {
          hyperCore: {
            role:
              "user",

            accountValue:
              "100",

            withdrawable:
              "90",

            totalNotionalPosition:
              "0",

            totalMarginUsed:
              "0",

            positions:
              [],

            spotBalances:
              [],

            fills:
              [],

            fundingPayments:
              [],

            portfolio:
              [],
          },

          hyperEvm: {
            chainId:
              999,

            nativeCurrency:
              "HYPE",

            balanceWei:
              "0x0",

            transactionCount:
              0,

            code:
              "0x",

            isContract:
              false,
          },

          coverage: {
            plan:
              input.analysisPlan,

            fillLimit:
              12,

            fundingLimit:
              12,

            fundingLookbackDays:
              7,

            positionLimit:
              8,

            spotBalanceLimit:
              8,

            portfolioPointLimit:
              12,

            hyperCoreProvider:
              "hyperliquid-info",

            hyperEvmProvider:
              "hyperliquid-json-rpc",
          },
        },
      };
    },
  };

test(
  "runs native HyperCore plus HyperEVM intelligence",
  async () => {
    const result =
      await runHyperliquidIntelligence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "pro",
        },

        deps
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.data.ok,
      true
    );

    if (
      result.data.ok
    ) {
      assert.equal(
        result.data
          .executionSurfaces
          .hyperEvm
          .chainId,
        999
      );
    }
  }
);

test(
  "rejects invalid Hyperliquid address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runHyperliquidIntelligence(
        {
          address:
            "invalid",
        },

        {
          async loadEvidence() {
            called =
              true;

            throw new Error(
              "must not run"
            );
          },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);
