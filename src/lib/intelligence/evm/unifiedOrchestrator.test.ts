import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  EvmTransaction,
} from "./types";

const walletA =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const walletC =
  "0x3333333333333333333333333333333333333333";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

function success<T>(
  data: T,
  providerId:
    "alchemy" | "goldrush" =
      "goldrush"
) {
  return {
    ok: true as const,
    providerId,
    latencyMs: 1,
    data,
  };
}

test(
  "runs a bounded unified wallet intelligence pipeline with shared transaction evidence",
  async () => {
    const rootTransactions:
      EvmTransaction[] = [
      {
        hash:
          hash("1"),

        blockNumber:
          100,

        timestamp:
          "2026-01-01T00:00:00Z",

        from:
          walletA,

        to:
          walletB,

        value:
          "100",
      },

      {
        hash:
          hash("2"),

        blockNumber:
          101,

        timestamp:
          "2026-01-01T00:01:00Z",

        from:
          walletB,

        to:
          walletA,

        value:
          "10",
      },
    ];

    const secondaryTransactions:
      EvmTransaction[] = [
      {
        hash:
          hash("3"),

        blockNumber:
          102,

        timestamp:
          "2026-01-01T00:02:00Z",

        from:
          walletB,

        to:
          walletC,

        value:
          "1",
      },
    ];

    let transactionCalls = 0;

    const deps:
      EvmUnifiedOrchestratorDependencies = {
      readTokenMetadata:
        async () =>
          success(
            {
              address:
                walletA,

              name:
                null,

              symbol:
                null,

              decimals:
                null,

              totalSupply:
                null,

              isContract:
                false,

              isErc20:
                false,
            },
            "alchemy"
          ),

      getTokenHolders:
        async () => {
          throw new Error(
            "Holder provider should not run for a wallet."
          );
        },

      getTransactions:
        async request => {
          transactionCalls += 1;

          if (
            request.address
              .toLowerCase() ===
            walletA
          ) {
            return success({
              transactions:
                rootTransactions,

              nextCursor:
                null,
            });
          }

          if (
            request.address
              .toLowerCase() ===
            walletB
          ) {
            return success({
              transactions:
                secondaryTransactions,

              nextCursor:
                null,
            });
          }

          return success({
            transactions: [],
            nextCursor:
              null,
          });
        },

      getTokenTransfers:
        async () => {
          throw new Error(
            "Transfer provider should not run for a non-ERC20 wallet."
          );
        },

      getContractDeployment:
        async () => {
          throw new Error(
            "Deployment provider should not run for a wallet."
          );
        },

      getTransactionReceipt:
        async () => {
          throw new Error(
            "Receipt provider should not run for a wallet."
          );
        },
    };

    const result =
      await runEvmUnifiedIntelligence(
        {
          networkId:
            "ethereum",

          address:
            walletA,
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

    if (!result.data.ok) {
      throw new Error(
        "Expected unified success."
      );
    }

    assert.equal(
      result.data.assetKind,
      "wallet"
    );

    assert.equal(
      result.data.modules
        .assetVerification
        .status,
      "complete"
    );

    assert.equal(
      result.data.modules
        .holderIntelligence
        .status,
      "not-run"
    );

    assert.equal(
      result.data.modules
        .deploymentIntelligence
        .status,
      "not-run"
    );

    assert.equal(
      result.data.modules
        .developerHistory
        .status,
      "not-run"
    );

    assert.equal(
      result.data.modules
        .fundingProvenance
        .status,
      "limited"
    );

    assert.equal(
      result.data.modules
        .walletRelationships
        .status,
      "limited"
    );

    assert.equal(
      result.data.modules
        .coordinatedWalletBehavior
        .status,
      "limited"
    );

    assert.equal(
      result.data.modules
        .walletGraph
        .status,
      "limited"
    );

    const graph =
      result.data.modules
        .walletGraph
        .data as {
          nodeCount: number;
          edgeCount: number;
        };

    assert.ok(
      graph.nodeCount >= 2
    );

    assert.ok(
      graph.edgeCount >= 1
    );

    assert.equal(
      transactionCalls,
      2
    );

    assert.equal(
      JSON.stringify(
        result.data
      ).includes(
        "providerId"
      ),
      false
    );

    assert.equal(
      JSON.stringify(
        result.data
      ).includes(
        "alchemy"
      ),
      false
    );

    assert.equal(
      JSON.stringify(
        result.data
      ).includes(
        "goldrush"
      ),
      false
    );
  }
);

test(
  "rejects an invalid unified EVM address before providers run",
  async () => {
    let providerCalled =
      false;

    const deps:
      EvmUnifiedOrchestratorDependencies = {
      readTokenMetadata:
        async () => {
          providerCalled =
            true;

          throw new Error(
            "Provider should not run."
          );
        },

      getTokenHolders:
        async () => {
          throw new Error();
        },

      getTransactions:
        async () => {
          throw new Error();
        },

      getTokenTransfers:
        async () => {
          throw new Error();
        },

      getContractDeployment:
        async () => {
          throw new Error();
        },

      getTransactionReceipt:
        async () => {
          throw new Error();
        },
    };

    const result =
      await runEvmUnifiedIntelligence(
        {
          networkId:
            "ethereum",

          address:
            "invalid",
        },
        deps
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      result.data.ok,
      false
    );

    assert.equal(
      providerCalled,
      false
    );
  }
);
