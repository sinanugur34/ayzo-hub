import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmDeepFundingTracing,
} from "./deepFundingTracing";

import type {
  EvmProviderResult,
  EvmTransaction,
  EvmTransactionsPage,
} from "./types";

const root =
  "0x1111111111111111111111111111111111111111";

const sourceA =
  "0x2222222222222222222222222222222222222222";

const sourceB =
  "0x3333333333333333333333333333333333333333";

const sourceC =
  "0x4444444444444444444444444444444444444444";

const noise =
  "0x5555555555555555555555555555555555555555";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

function tx(
  id: string,
  from: string | null,
  to: string | null,
  value: string | null,
  blockNumber: number
): EvmTransaction {
  return {
    hash:
      hash(id),

    blockNumber,

    timestamp:
      `2026-01-01T00:0${blockNumber}:00Z`,

    from,
    to,
    value,
  };
}

function provider(
  pages:
    Readonly<
      Record<
        string,
        readonly EvmTransaction[]
      >
    >
) {
  const calls:
    string[] = [];

  const getTransactions =
    async (
      address: string,
      cursor:
        string | null
    ): Promise<
      EvmProviderResult<
        EvmTransactionsPage
      >
    > => {
      const normalized =
        address.toLowerCase();

      calls.push(
        `${normalized}:${cursor ?? ""}`
      );

      return {
        ok: true,

        providerId:
          "goldrush",

        latencyMs:
          0,

        data: {
          transactions:
            pages[
              normalized
            ] ?? [],

          nextCursor:
            null,
        },
      };
    };

  return {
    calls,
    getTransactions,
  };
}

test(
  "traces deterministic three-hop upstream native funding",
  async () => {
    const mock =
      provider({
        [root]: [
          tx(
            "1",
            sourceA,
            root,
            "100",
            1
          ),

          // Outgoing noise must not
          // become upstream funding.
          tx(
            "a",
            root,
            noise,
            "50",
            2
          ),

          // Zero-value incoming is
          // not funding evidence.
          tx(
            "b",
            noise,
            root,
            "0",
            3
          ),
        ],

        [sourceA]: [
          tx(
            "2",
            sourceB,
            sourceA,
            "200",
            4
          ),
        ],

        [sourceB]: [
          tx(
            "3",
            sourceC,
            sourceB,
            "300",
            5
          ),
        ],

        [sourceC]: [],
      });

    const result =
      await analyzeEvmDeepFundingTracing({
        rootAddress:
          root,

        maxHops:
          3,

        maxNodes:
          10,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          10,

        getTransactions:
          mock
            .getTransactions,
      });

    assert.equal(
      result.maxDepthReached,
      3
    );

    const terminalNode =
      result.nodes.find(
        node =>
          node.address ===
          sourceC
      );

    assert.ok(
      terminalNode
    );

    assert.equal(
      terminalNode.depth,
      3
    );

    assert.deepEqual(
      result
        .evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
        hash("3"),
      ]
    );

    assert.equal(
      result.edges.some(
        edge =>
          edge.from ===
            root &&
          edge.to ===
            noise
      ),
      false
    );

    assert.equal(
      result.edges.some(
        edge =>
          edge.from ===
            noise
      ),
      false
    );

    const deepest =
      result.paths.find(
        path =>
          path
            .sourceAddress ===
          sourceC
      );

    assert.ok(deepest);

    assert.equal(
      deepest.hopCount,
      3
    );

    assert.deepEqual(
      deepest.addresses,
      [
        sourceC,
        sourceB,
        sourceA,
        root,
      ]
    );

    assert.deepEqual(
      deepest
        .evidenceTransactionHashes,
      [
        hash("3"),
        hash("2"),
        hash("1"),
      ]
    );

    assert.equal(
      result.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      result.coverage
        .includesUltimateOriginInference,
      false
    );
  }
);

test(
  "dedupes cycles and does not recurse back through the current path",
  async () => {
    const mock =
      provider({
        [root]: [
          tx(
            "4",
            sourceA,
            root,
            "10",
            1
          ),
        ],

        [sourceA]: [
          tx(
            "5",
            root,
            sourceA,
            "20",
            2
          ),

          tx(
            "6",
            sourceB,
            sourceA,
            "30",
            3
          ),
        ],

        [sourceB]: [],
      });

    const result =
      await analyzeEvmDeepFundingTracing({
        rootAddress:
          root,

        maxHops:
          4,

        maxNodes:
          10,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          10,

        getTransactions:
          mock
            .getTransactions,
      });

    assert.equal(
      result.nodes.filter(
        node =>
          node.address ===
          root
      ).length,
      1
    );

    assert.equal(
      mock.calls.filter(
        call =>
          call.startsWith(
            `${root}:`
          )
      ).length,
      1
    );

    assert.equal(
      result.paths.some(
        path =>
          path.sourceAddress ===
            root &&
          path.hopCount >
            0
      ),
      false
    );

    const sourceBPath =
      result.paths.find(
        path =>
          path
            .sourceAddress ===
          sourceB
      );

    assert.ok(
      sourceBPath
    );

    assert.deepEqual(
      sourceBPath.addresses,
      [
        sourceB,
        sourceA,
        root,
      ]
    );
  }
);

test(
  "stops at provider request budget and reports truncation",
  async () => {
    const mock =
      provider({
        [root]: [
          tx(
            "7",
            sourceA,
            root,
            "1",
            1
          ),
        ],

        [sourceA]: [
          tx(
            "8",
            sourceB,
            sourceA,
            "1",
            2
          ),
        ],
      });

    const result =
      await analyzeEvmDeepFundingTracing({
        rootAddress:
          root,

        maxHops:
          4,

        maxNodes:
          10,

        transactionPagesPerNode:
          1,

        providerRequestBudget:
          1,

        getTransactions:
          mock
            .getTransactions,
      });

    assert.equal(
      result.coverage
        .providerRequestCount,
      1
    );

    assert.equal(
      result.coverage
        .providerRequestBudgetReached,
      true
    );

    assert.equal(
      result.coverage
        .truncated,
      true
    );
  }
);

test(
  "rejects unsafe bounds and invalid roots",
  async () => {
    await assert.rejects(
      () =>
        analyzeEvmDeepFundingTracing({
          rootAddress:
            "invalid",

          maxHops:
            4,

          maxNodes:
            10,

          transactionPagesPerNode:
            1,

          providerRequestBudget:
            10,

          getTransactions:
            provider({})
              .getTransactions,
        }),

      /Invalid EVM deep-funding root address/
    );

    await assert.rejects(
      () =>
        analyzeEvmDeepFundingTracing({
          rootAddress:
            root,

          maxHops:
            5,

          maxNodes:
            10,

          transactionPagesPerNode:
            1,

          providerRequestBudget:
            10,

          getTransactions:
            provider({})
              .getTransactions,
        }),

      /maxHops must be an integer between 1 and 4/
    );
  }
);
