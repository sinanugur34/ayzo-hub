import assert from "node:assert/strict";
import test from "node:test";

import {
  runSuiIntelligence,
  type SuiEngineDependencies,
} from "./engine";

const ADDRESS =
  `0x${"11".repeat(32)}`;

function dependencies():
  SuiEngineDependencies {
  return {
    async loadEvidence(
      input
    ) {
      return {
        ok:
          true,

        providerId:
          "sui-graphql",

        latencyMs:
          1,

        data: {
          chainIdentifier:
            "mainnet",

          address:
            input.address,

          suiBalanceMist:
            "1000000000",

          balances: [
            {
              coinType:
                "0x2::sui::SUI",

              totalBalance:
                "1000000000",

              coinBalance:
                "1000000000",

              addressBalance:
                "0",

              symbol:
                "SUI",

              name:
                "Sui",

              decimals:
                9,
            },
          ],

          ownedObjects:
            [],

          transactions:
            [],

          earliestTransactions:
            [],

          subjectObject: {
            exists:
              false,

            kind:
              null,

            objectId:
              null,

            version:
              null,

            digest:
              null,

            type:
              null,

            hasPublicTransfer:
              null,
          },

          coverage: {
            plan:
              input
                .analysisPlan,

            historyLimit:
              input.analysisPlan ===
                "advanced"
                ? 32
                : input.analysisPlan ===
                    "pro"
                  ? 16
                  : 8,

            earliestHistoryLimit:
              4,

            balanceLimit:
              8,

            objectLimit:
              8,

            historyHasMore:
              false,

            earliestHistoryHasMore:
              false,

            balancesHaveMore:
              false,

            objectsHaveMore:
              false,
          },
        },
      };
    },
  };
}

test(
  "runs Sui intelligence with account and asset evidence",
  async () => {
    const result =
      await runSuiIntelligence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "pro",
        },

        dependencies()
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
        result.data.network,
        "sui"
      );

      assert.equal(
        result.data
          .balances
          .length,
        1
      );
    }
  }
);

test(
  "rejects invalid Sui address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runSuiIntelligence(
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
