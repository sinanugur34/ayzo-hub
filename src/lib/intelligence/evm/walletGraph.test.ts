import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmWalletGraph,
  type EvmWalletGraphEvidenceCoverage,
  type EvmWalletGraphObservation,
} from "./walletGraph";

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

const unrelatedA =
  "0x7777777777777777777777777777777777777777";

const unrelatedB =
  "0x8888888888888888888888888888888888888888";

const token =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

const coverage:
  EvmWalletGraphEvidenceCoverage = {
  includesEvmTransactions:
    true,

  includesErc20Transfers:
    true,

  includesOwnershipInference:
    false,

  limitation:
    "Observed relationship graph only; ownership inference is not included.",
};

test(
  "builds a deterministic bounded two-hop wallet graph",
  () => {
    const observations:
      EvmWalletGraphObservation[] =
        [
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("1"),

            blockNumber:
              100,

            timestamp:
              "2026-01-01T00:00:00Z",

            from:
              walletA,

            to:
              walletB,

            rawValue:
              "100",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("2"),

            blockNumber:
              101,

            timestamp:
              "2026-01-01T00:01:00Z",

            from:
              walletB,

            to:
              walletA,

            rawValue:
              "20",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("3"),

            blockNumber:
              102,

            timestamp:
              "2026-01-01T00:02:00Z",

            from:
              walletA,

            to:
              walletE,

            rawValue:
              "10",
          },

          {
            kind:
              "erc20_transfer",

            transactionHash:
              hash("4"),

            blockNumber:
              103,

            timestamp:
              "2026-01-01T00:03:00Z",

            from:
              walletB,

            to:
              walletC,

            tokenAddress:
              token,

            rawValue:
              "50",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("5"),

            blockNumber:
              104,

            timestamp:
              "2026-01-01T00:04:00Z",

            from:
              walletB,

            to:
              walletF,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("6"),

            blockNumber:
              105,

            timestamp:
              "2026-01-01T00:05:00Z",

            from:
              walletC,

            to:
              walletD,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("7"),

            blockNumber:
              106,

            timestamp:
              "2026-01-01T00:06:00Z",

            from:
              walletB,

            to:
              walletE,

            rawValue:
              "1",
          },

          {
            kind:
              "erc20_transfer",

            transactionHash:
              hash("8"),

            blockNumber:
              107,

            timestamp:
              "2026-01-01T00:07:00Z",

            from:
              walletE,

            to:
              walletC,

            tokenAddress:
              token,

            rawValue:
              "5",
          },

          // Exact duplicate.
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("1"),

            blockNumber:
              100,

            timestamp:
              "2026-01-01T00:00:00Z",

            from:
              walletA,

            to:
              walletB,

            rawValue:
              "100",
          },

          // Self evidence is ignored.
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("9"),

            blockNumber:
              108,

            timestamp:
              "2026-01-01T00:08:00Z",

            from:
              walletA,

            to:
              walletA,

            rawValue:
              "1",
          },

          // Valid but disconnected evidence.
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("a"),

            blockNumber:
              109,

            timestamp:
              "2026-01-01T00:09:00Z",

            from:
              unrelatedA,

            to:
              unrelatedB,

            rawValue:
              "1",
          },
        ];

    const result =
      analyzeEvmWalletGraph({
        rootAddress:
          walletA,

        observations,

        maxHops:
          2,

        maxNodes:
          4,

        maxEdges:
          4,

        evidenceCoverage:
          coverage,
      });

    assert.equal(
      result.rootAddress,
      walletA
    );

    assert.equal(
      result.nodeCount,
      4
    );

    assert.equal(
      result.edgeCount,
      4
    );

    assert.equal(
      result.maxDepthReached,
      2
    );

    assert.equal(
      result.duplicateEvidenceCount,
      1
    );

    assert.equal(
      result.ignoredEvidenceCount,
      1
    );

    assert.equal(
      result.coverage
        .nodeLimitReached,
      true
    );

    assert.equal(
      result.coverage
        .hopLimitReached,
      true
    );

    assert.equal(
      result.coverage
        .edgeLimitReached,
      true
    );

    assert.equal(
      result.coverage
        .truncated,
      true
    );

    assert.equal(
      result.coverage
        .includesOwnershipInference,
      false
    );

    const root =
      result.nodes.find(
        node =>
          node.address ===
          walletA
      );

    const b =
      result.nodes.find(
        node =>
          node.address ===
          walletB
      );

    const c =
      result.nodes.find(
        node =>
          node.address ===
          walletC
      );

    const e =
      result.nodes.find(
        node =>
          node.address ===
          walletE
      );

    const d =
      result.nodes.find(
        node =>
          node.address ===
          walletD
      );

    const f =
      result.nodes.find(
        node =>
          node.address ===
          walletF
      );

    assert.ok(root);
    assert.ok(b);
    assert.ok(c);
    assert.ok(e);

    assert.equal(
      d,
      undefined
    );

    assert.equal(
      f,
      undefined
    );

    assert.equal(
      root.depth,
      0
    );

    assert.equal(
      b.depth,
      1
    );

    assert.equal(
      e.depth,
      1
    );

    assert.equal(
      c.depth,
      2
    );

    assert.equal(
      c.parentAddress,
      walletB
    );

    const ab =
      result.edges.find(
        edge =>
          (
            edge.addressA ===
              walletA &&
            edge.addressB ===
              walletB
          ) ||
          (
            edge.addressA ===
              walletB &&
            edge.addressB ===
              walletA
          )
      );

    assert.ok(ab);

    assert.equal(
      ab.direction,
      "bidirectional"
    );

    assert.equal(
      ab.interactionCount,
      2
    );

    assert.deepEqual(
      ab.evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
      ]
    );

    const bc =
      result.edges.find(
        edge =>
          edge
            .observedTokenAddresses
            .includes(
              token
            )
      );

    assert.ok(bc);

    assert.equal(
      result.nodes.some(
        node =>
          node.address ===
          unrelatedA ||
          node.address ===
          unrelatedB
      ),
      false
    );

    assert.ok(
      result
        .excludedEvidenceCount >
        0
    );
  }
);

test(
  "rejects invalid graph bounds and root",
  () => {
    assert.throws(
      () =>
        analyzeEvmWalletGraph({
          rootAddress:
            "invalid",

          observations: [],

          maxHops:
            2,

          maxNodes:
            10,

          maxEdges:
            20,

          evidenceCoverage:
            coverage,
        }),

      /Invalid EVM graph root address/
    );

    assert.throws(
      () =>
        analyzeEvmWalletGraph({
          rootAddress:
            walletA,

          observations: [],

          maxHops:
            4,

          maxNodes:
            10,

          maxEdges:
            20,

          evidenceCoverage:
            coverage,
        }),

      /maxHops must be an integer between 1 and 3/
    );
  }
);
