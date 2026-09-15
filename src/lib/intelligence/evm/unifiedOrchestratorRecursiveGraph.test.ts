import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import type {
  EvmTransaction,
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

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

function success<T>(
  data: T,
  providerId:
    "goldrush" | "alchemy" =
      "goldrush"
) {
  return {
    ok: true as const,

    providerId,

    latencyMs:
      1,

    data,
  };
}

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
      `2026-01-01T00:0${blockNumber}:00Z`,

    from,
    to,

    value:
      "1",
  };
}

function dependencies(
  calls: string[]
): EvmUnifiedOrchestratorDependencies {
  return {
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
          "Holder provider should not run."
        );
      },

    getTransactions:
      async request => {
        const address =
          request.address
            .toLowerCase();

        const cursor =
          request.cursor ??
          "";

        calls.push(
          `${address}:${cursor}`
        );

        if (
          cursor !== ""
        ) {
          return success({
            transactions:
              [],
            nextCursor:
              null,
          });
        }

        if (
          address ===
          walletA
        ) {
          return success({
            transactions: [
              transaction(
                "1",
                walletA,
                walletB,
                1
              ),
            ],

            nextCursor:
              null,
          });
        }

        if (
          address ===
          walletB
        ) {
          return success({
            transactions: [
              transaction(
                "2",
                walletB,
                walletC,
                2
              ),
            ],

            nextCursor:
              null,
          });
        }

        if (
          address ===
          walletC
        ) {
          return success({
            transactions: [
              transaction(
                "3",
                walletC,
                walletD,
                3
              ),
            ],

            nextCursor:
              null,
          });
        }

        if (
          address ===
          walletD
        ) {
          return success({
            transactions: [
              transaction(
                "4",
                walletD,
                walletE,
                4
              ),
            ],

            nextCursor:
              null,
          });
        }

        return success({
          transactions:
            [],

          nextCursor:
            null,
        });
      },

    getTokenTransfers:
      async () => {
        throw new Error(
          "Transfer provider should not run for wallet analysis."
        );
      },

    getContractDeployment:
      async () => {
        throw new Error(
          "Deployment provider should not run for wallet analysis."
        );
      },

    getTransactionReceipt:
      async () => {
        throw new Error(
          "Receipt provider should not run for wallet analysis."
        );
      },
  };
}

async function runPlan(
  plan: AnalysisDepthPlan,
  calls: string[]
) {
  const result =
    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",

        address:
          walletA,

        analysisPlan:
          plan,
      },
      dependencies(
        calls
      )
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
      "Expected successful intelligence result."
    );
  }

  return result.data;
}

type WalletGraphData = {
  nodeCount:
    number;

  edgeCount:
    number;

  maxDepthReached:
    number;

  nodes:
    readonly {
      address:
        string;

      depth:
        number;
    }[];

  coverage: {
    maxHops:
      number;

    includesOwnershipInference:
      false;

    limitation:
      string;
  };
};

test(
  "Free and Pro preserve non-recursive unified graph expansion",
  async () => {
    for (
      const plan of
        [
          "free",
          "pro",
        ] as const
    ) {
      const calls:
        string[] = [];

      const data =
        await runPlan(
          plan,
          calls
        );

      const graph =
        data.modules
          .walletGraph
          .data as WalletGraphData;

      assert.equal(
        calls.some(
          call =>
            call.startsWith(
              `${walletC}:`
            )
        ),
        false
      );

      assert.equal(
        calls.some(
          call =>
            call.startsWith(
              `${walletD}:`
            )
        ),
        false
      );

      assert.equal(
        graph.coverage
          .limitation
          .includes(
            "not an exhaustive recursive graph"
          ),
        true
      );
    }
  }
);

test(
  "Advanced performs provider-backed recursive four-hop graph discovery",
  async () => {
    const calls:
      string[] = [];

    const data =
      await runPlan(
        "advanced",
        calls
      );

    const graph =
      data.modules
        .walletGraph
        .data as WalletGraphData;

    assert.equal(
      graph.coverage
        .maxHops,
      4
    );

    assert.equal(
      graph.maxDepthReached,
      4
    );

    assert.equal(
      graph.nodeCount,
      5
    );

    assert.equal(
      graph.edgeCount,
      4
    );

    assert.deepEqual(
      graph.nodes
        .map(
          node => [
            node.address,
            node.depth,
          ] as const
        )
        .sort(
          (
            left,
            right
          ) =>
            left[1] -
              right[1] ||
            left[0]
              .localeCompare(
                right[0]
              )
        ),
      [
        [
          walletA,
          0,
        ],
        [
          walletB,
          1,
        ],
        [
          walletC,
          2,
        ],
        [
          walletD,
          3,
        ],
        [
          walletE,
          4,
        ],
      ]
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${walletA}:`
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${walletB}:`
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${walletC}:`
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${walletD}:`
      ).length,
      1
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

    assert.equal(
      graph.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      graph.coverage
        .limitation
        .includes(
          "Advanced recursive discovery"
        ),
      true
    );

    assert.equal(
      graph.coverage
        .limitation
        .includes(
          "not an exhaustive recursive graph"
        ),
      false
    );
  }
);
