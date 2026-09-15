import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmWalletGraph,
  type EvmWalletGraphEvidenceCoverage,
  type EvmWalletGraphObservation,
} from "./walletGraph";

import {
  analyzeEvmMultiHopPathCorroboration,
} from "./walletGraphPathCorroboration";

const walletA =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const source =
  "0x3333333333333333333333333333333333333333";

const bridge =
  "0x4444444444444444444444444444444444444444";

const noise =
  "0x5555555555555555555555555555555555555555";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

const coverage:
  EvmWalletGraphEvidenceCoverage = {
  includesEvmTransactions:
    true,

  includesErc20Transfers:
    false,

  includesOwnershipInference:
    false,

  limitation:
    "Observed directed path evidence only.",
};

test(
  "finds deterministic directed multi-hop corroboration for two target wallets",
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
              1,

            timestamp:
              "2026-01-01T00:00:00Z",

            from:
              source,

            to:
              walletA,

            rawValue:
              "10",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("2"),

            blockNumber:
              2,

            timestamp:
              "2026-01-01T00:01:00Z",

            from:
              source,

            to:
              bridge,

            rawValue:
              "20",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("3"),

            blockNumber:
              3,

            timestamp:
              "2026-01-01T00:02:00Z",

            from:
              bridge,

            to:
              walletB,

            rawValue:
              "20",
          },

          /*
           * Reverse noise must not become evidence for
           * source -> walletB.
           */
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("4"),

            blockNumber:
              4,

            timestamp:
              "2026-01-01T00:03:00Z",

            from:
              walletB,

            to:
              source,

            rawValue:
              "1",
          },
        ];

    const graph =
      analyzeEvmWalletGraph({
        rootAddress:
          walletA,

        observations,

        maxHops:
          4,

        maxNodes:
          10,

        maxEdges:
          10,

        evidenceCoverage:
          coverage,
      });

    const result =
      analyzeEvmMultiHopPathCorroboration({
        graph,

        targetWallets: [
          walletB,
          walletA,
        ],

        observations,

        maxPathHops:
          4,
      });

    const match =
      result.find(
        value =>
          value
            .sourceAddress ===
          source
      );

    assert.ok(match);

    assert.deepEqual(
      match.wallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.equal(
      match.pathCount,
      2
    );

    assert.equal(
      match.maxPathHops,
      2
    );

    assert.deepEqual(
      match
        .evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
        hash("3"),
      ]
    );

    const walletBPath =
      match.paths.find(
        path =>
          path
            .walletAddress ===
          walletB
      );

    assert.ok(
      walletBPath
    );

    assert.deepEqual(
      walletBPath.addresses,
      [
        source,
        bridge,
        walletB,
      ]
    );

    assert.deepEqual(
      walletBPath
        .evidenceTransactionHashes,
      [
        hash("2"),
        hash("3"),
      ]
    );
  }
);

test(
  "does not treat reverse-only connectivity as directed corroboration",
  () => {
    const observations:
      EvmWalletGraphObservation[] =
        [
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("5"),

            blockNumber:
              5,

            timestamp:
              null,

            from:
              walletA,

            to:
              source,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("6"),

            blockNumber:
              6,

            timestamp:
              null,

            from:
              walletB,

            to:
              bridge,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("7"),

            blockNumber:
              7,

            timestamp:
              null,

            from:
              bridge,

            to:
              source,

            rawValue:
              "1",
          },
        ];

    const graph =
      analyzeEvmWalletGraph({
        rootAddress:
          walletA,

        observations,

        maxHops:
          4,

        maxNodes:
          10,

        maxEdges:
          10,

        evidenceCoverage:
          coverage,
      });

    const result =
      analyzeEvmMultiHopPathCorroboration({
        graph,

        targetWallets: [
          walletA,
          walletB,
        ],

        observations,

        maxPathHops:
          4,
      });

    assert.equal(
      result.some(
        value =>
          value
            .sourceAddress ===
          source
      ),
      false
    );
  }
);

test(
  "does not duplicate a pure one-hop shared source signal",
  () => {
    const observations:
      EvmWalletGraphObservation[] =
        [
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("8"),

            blockNumber:
              8,

            timestamp:
              null,

            from:
              source,

            to:
              walletA,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("9"),

            blockNumber:
              9,

            timestamp:
              null,

            from:
              source,

            to:
              walletB,

            rawValue:
              "1",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("a"),

            blockNumber:
              10,

            timestamp:
              null,

            from:
              walletA,

            to:
              noise,

            rawValue:
              "1",
          },
        ];

    const graph =
      analyzeEvmWalletGraph({
        rootAddress:
          walletA,

        observations,

        maxHops:
          4,

        maxNodes:
          10,

        maxEdges:
          10,

        evidenceCoverage:
          coverage,
      });

    const result =
      analyzeEvmMultiHopPathCorroboration({
        graph,

        targetWallets: [
          walletA,
          walletB,
        ],

        observations,

        maxPathHops:
          4,
      });

    assert.equal(
      result.some(
        value =>
          value
            .sourceAddress ===
          source
      ),
      false
    );
  }
);

test(
  "rejects a path bound deeper than the selected graph",
  () => {
    const graph =
      analyzeEvmWalletGraph({
        rootAddress:
          walletA,

        observations: [
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("b"),

            blockNumber:
              11,

            timestamp:
              null,

            from:
              walletA,

            to:
              walletB,

            rawValue:
              "1",
          },
        ],

        maxHops:
          2,

        maxNodes:
          10,

        maxEdges:
          10,

        evidenceCoverage:
          coverage,
      });

    assert.throws(
      () =>
        analyzeEvmMultiHopPathCorroboration({
          graph,

          targetWallets: [
            walletA,
            walletB,
          ],

          observations: [],

          maxPathHops:
            4,
        }),

      /maxPathHops must be an integer between 2 and the graph maxHops/
    );
  }
);
