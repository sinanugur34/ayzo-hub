import assert from "node:assert/strict";
import test from "node:test";

import {
  runTonIntelligence,
  type TonEngineDependencies,
} from "./engine";

const ADDRESS =
  "0:4098805d2272a61b375350c6b2f5faaaf27c8267d8e7521ff2045104fdc7de76";

const deps:
  TonEngineDependencies = {
    async loadEvidence(
      input
    ) {
      return {
        ok:
          true,

        providerId:
          "toncenter-v3",

        latencyMs:
          1,

        data: {
          account: {
            address:
              input.address,

            status:
              "active",

            balanceNano:
              "1000",

            codeHash:
              null,

            interfaces:
              [],

            suspended:
              false,

            lastTransactionHash:
              null,

            lastTransactionLt:
              null,
          },

          transactions:
            [],

          earliestTransactions:
            [],

          jettonWallets:
            [],

          jettonTransfers:
            [],

          coverage: {
            plan:
              input.analysisPlan,

            historyLimit:
              8,

            earliestHistoryLimit:
              4,

            jettonWalletLimit:
              8,

            jettonTransferLimit:
              8,

            provider:
              "toncenter-v3",
          },
        },
      };
    },
  };

test(
  "runs TON native intelligence",
  async () => {
    const result =
      await runTonIntelligence(
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
        result.data.network,
        "ton"
      );
    }
  }
);

test(
  "rejects invalid TON address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runTonIntelligence(
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
