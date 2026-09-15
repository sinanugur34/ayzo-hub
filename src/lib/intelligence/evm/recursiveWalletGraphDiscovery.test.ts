import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmRecursiveWalletGraphDiscovery,
} from "./recursiveWalletGraphDiscovery";

import type {
  EvmWalletGraphObservation,
} from "./walletGraph";

import type {
  EvmProviderResult,
  EvmTransaction,
  EvmTransactionsPage,
} from "./types";

const walletA =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const walletC =
  "0x3333333333333333333333333333333333333333";

const walletD =
  "0x4444444444444444444444444444444444444444";

const walletE =
  "0x5555555555555555555555555555555555555555";

const walletF =
  "0x6666666666666666666666666666666666666666";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

function transaction(
  character: string,
  from: string,
  to: string,
  blockNumber: number
): EvmTransaction {
  return {
    hash:
      hash(character),

    blockNumber,

    timestamp:
      `2026-01-01T00:0${Math.min(
        blockNumber,
        9
      )}:00Z`,

    from,
    to,

    value:
      "1",
  };
}

function success(
  transactions:
    readonly EvmTransaction[],
  nextCursor:
    string | null =
      null
): EvmProviderResult<
  EvmTransactionsPage
> {
  return {
    ok: true,

    providerId:
      "goldrush",

    latencyMs:
      1,

    data: {
      transactions,
      nextCursor,
    },
  };
}

const rootObservation:
  EvmWalletGraphObservation = {
  kind:
    "evm_transaction",

  transactionHash:
    hash("1"),

  blockNumber:
    1,

  timestamp:
    "2026-01-01T00:01:00Z",

  from:
    walletA,

  to:
    walletB,

  rawValue:
    "1",
};

test(
  "discovers a deterministic provider-backed four-hop chain without querying the boundary node",
  async () => {
    const calls:
      string[] = [];

    const result =
      await analyzeEvmRecursiveWalletGraphDiscovery({
        rootAddress:
          walletA,

        rootObservations: [
          rootObservation,
        ],

        maxHops:
          4,

        maxNodes:
          28,

        maxEdges:
          48,

        maxNeighborsPerNode:
          4,

        transactionPagesPerNode:
          2,

        providerRequestBudget:
          16,

        getTransactions:
          async (
            address,
            cursor
          ) => {
            calls.push(
              `${address}:${cursor ?? ""}`
            );

            if (
              address ===
              walletB
            ) {
              return success([
                transaction(
                  "2",
                  walletB,
                  walletC,
                  2
                ),
              ]);
            }

            if (
              address ===
              walletC
            ) {
              return success([
                transaction(
                  "3",
                  walletC,
                  walletD,
                  3
                ),
              ]);
            }

            if (
              address ===
              walletD
            ) {
              return success([
                transaction(
                  "4",
                  walletD,
                  walletE,
                  4
                ),
              ]);
            }

            throw new Error(
              `Unexpected provider query for ${address}.`
            );
          },
      });

    assert.equal(
      result
        .discoveredNodeCount,
      5
    );

    assert.equal(
      result
        .maxDepthDiscovered,
      4
    );

    assert.equal(
      result
        .providerQueriedNodeCount,
      3
    );

    assert.equal(
      result
        .providerRequestCount,
      3
    );

    assert.equal(
      result
        .successfulProviderRequestCount,
      3
    );

    assert.equal(
      result
        .providerFailureCount,
      0
    );

    assert.equal(
      result
        .hopLimitReached,
      true
    );

    assert.equal(
      result
        .truncated,
      true
    );

    assert.deepEqual(
      calls,
      [
        `${walletB}:`,
        `${walletC}:`,
        `${walletD}:`,
      ]
    );

    assert.equal(
      calls.some(
        call =>
          call.startsWith(
            `${walletE}:`
          )
      ),
      false
    );

    assert.deepEqual(
      result.observations.map(
        observation =>
          observation
            .transactionHash
      ),
      [
        hash("1"),
        hash("2"),
        hash("3"),
        hash("4"),
      ]
    );
  }
);

test(
  "dedupes discovered cycles and never queries the root as a recursive child",
  async () => {
    const calls:
      string[] = [];

    const result =
      await analyzeEvmRecursiveWalletGraphDiscovery({
        rootAddress:
          walletA,

        rootObservations: [
          rootObservation,
        ],

        maxHops:
          4,

        maxNodes:
          28,

        maxEdges:
          48,

        maxNeighborsPerNode:
          4,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          16,

        getTransactions:
          async address => {
            calls.push(address);

            if (
              address ===
              walletB
            ) {
              return success([
                transaction(
                  "2",
                  walletB,
                  walletA,
                  2
                ),

                transaction(
                  "3",
                  walletB,
                  walletC,
                  3
                ),
              ]);
            }

            if (
              address ===
              walletC
            ) {
              return success([
                transaction(
                  "4",
                  walletC,
                  walletB,
                  4
                ),
              ]);
            }

            return success([]);
          },
      });

    assert.equal(
      result
        .discoveredNodeCount,
      3
    );

    assert.equal(
      result
        .providerQueriedNodeCount,
      2
    );

    assert.equal(
      calls.filter(
        address =>
          address ===
          walletA
      ).length,
      0
    );

    assert.equal(
      calls.filter(
        address =>
          address ===
          walletB
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        address =>
          address ===
          walletC
      ).length,
      1
    );
  }
);

test(
  "enforces per-node branching before broad activity can consume the entire graph",
  async () => {
    const result =
      await analyzeEvmRecursiveWalletGraphDiscovery({
        rootAddress:
          walletA,

        rootObservations: [
          rootObservation,

          {
            ...rootObservation,

            transactionHash:
              hash("2"),

            to:
              walletC,
          },

          {
            ...rootObservation,

            transactionHash:
              hash("3"),

            to:
              walletD,
          },
        ],

        maxHops:
          4,

        maxNodes:
          28,

        maxEdges:
          48,

        maxNeighborsPerNode:
          2,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          16,

        getTransactions:
          async () =>
            success([]),
      });

    assert.equal(
      result
        .neighborLimitReached,
      true
    );

    assert.equal(
      result
        .discoveredNodeCount,
      3
    );

    assert.equal(
      result
        .truncated,
      true
    );
  }
);

test(
  "stops at the logical provider request budget and reports partial coverage",
  async () => {
    const calls:
      string[] = [];

    const result =
      await analyzeEvmRecursiveWalletGraphDiscovery({
        rootAddress:
          walletA,

        rootObservations: [
          rootObservation,
        ],

        maxHops:
          4,

        maxNodes:
          28,

        maxEdges:
          48,

        maxNeighborsPerNode:
          4,

        transactionPagesPerNode:
          2,

        providerRequestBudget:
          1,

        getTransactions:
          async (
            address,
            cursor
          ) => {
            calls.push(
              `${address}:${cursor ?? ""}`
            );

            return success(
              [
                transaction(
                  "2",
                  walletB,
                  walletC,
                  2
                ),
              ],
              "next"
            );
          },
      });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      result
        .providerRequestCount,
      1
    );

    assert.equal(
      result
        .providerRequestBudgetReached,
      true
    );

    assert.equal(
      result
        .truncated,
      true
    );

    assert.equal(
      result
        .maxDepthDiscovered,
      2
    );
  }
);

test(
  "provider failures degrade to partial discovery instead of failing the whole intelligence request",
  async () => {
    const result =
      await analyzeEvmRecursiveWalletGraphDiscovery({
        rootAddress:
          walletA,

        rootObservations: [
          rootObservation,
        ],

        maxHops:
          4,

        maxNodes:
          28,

        maxEdges:
          48,

        maxNeighborsPerNode:
          4,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          16,

        getTransactions:
          async () => ({
            ok: false,

            providerId:
              "goldrush",

            latencyMs:
              1,

            code:
              "UPSTREAM_ERROR",

            error:
              "test",
          }),
      });

    assert.equal(
      result
        .providerFailureCount,
      1
    );

    assert.equal(
      result
        .providerRequestCount,
      1
    );

    assert.equal(
      result
        .truncated,
      true
    );

    assert.equal(
      result
        .discoveredNodeCount,
      2
    );
  }
);

test(
  "rejects unsafe recursive discovery bounds",
  async () => {
    await assert.rejects(
      () =>
        analyzeEvmRecursiveWalletGraphDiscovery({
          rootAddress:
            "invalid",

          rootObservations:
            [],

          maxHops:
            4,

          maxNodes:
            28,

          maxEdges:
            48,

          maxNeighborsPerNode:
            4,

          transactionPagesPerNode:
            2,

          providerRequestBudget:
            16,

          getTransactions:
            async () =>
              success([]),
        }),

      /Invalid EVM recursive graph root address/
    );

    await assert.rejects(
      () =>
        analyzeEvmRecursiveWalletGraphDiscovery({
          rootAddress:
            walletA,

          rootObservations:
            [],

          maxHops:
            5,

          maxNodes:
            28,

          maxEdges:
            48,

          maxNeighborsPerNode:
            4,

          transactionPagesPerNode:
            2,

          providerRequestBudget:
            16,

          getTransactions:
            async () =>
              success([]),
        }),

      /maxHops must be an integer between 1 and 4/
    );

    await assert.rejects(
      () =>
        analyzeEvmRecursiveWalletGraphDiscovery({
          rootAddress:
            walletA,

          rootObservations:
            [],

          maxHops:
            4,

          maxNodes:
            28,

          maxEdges:
            48,

          maxNeighborsPerNode:
            4,

          transactionPagesPerNode:
            2,

          providerRequestBudget:
            41,

          getTransactions:
            async () =>
              success([]),
        }),

      /providerRequestBudget must be an integer between 1 and 40/
    );
  }
);

void walletE;
void walletF;
