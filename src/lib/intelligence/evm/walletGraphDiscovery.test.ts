import assert from "node:assert/strict";
import test from "node:test";

import {
  rankEvmWalletGraphNeighbors,
} from "./walletGraphDiscovery";

import type {
  EvmWalletGraphObservation,
} from "./walletGraph";

const root =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const walletC =
  "0x3333333333333333333333333333333333333333";

const unrelatedA =
  "0x4444444444444444444444444444444444444444";

const unrelatedB =
  "0x5555555555555555555555555555555555555555";

const token =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

test(
  "ranks graph neighbors by deterministic evidence strength",
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
              null,

            from:
              root,

            to:
              walletB,

            rawValue:
              "1",
          },

          {
            kind:
              "erc20_transfer",

            transactionHash:
              hash("2"),

            blockNumber:
              2,

            timestamp:
              null,

            from:
              walletB,

            to:
              root,

            tokenAddress:
              token,

            rawValue:
              "10",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("3"),

            blockNumber:
              3,

            timestamp:
              null,

            from:
              root,

            to:
              walletC,

            rawValue:
              "1",
          },

          // Exact duplicate should not
          // strengthen wallet B.
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("1"),

            blockNumber:
              1,

            timestamp:
              null,

            from:
              root,

            to:
              walletB,

            rawValue:
              "1",
          },

          // Not connected to focal.
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("4"),

            blockNumber:
              4,

            timestamp:
              null,

            from:
              unrelatedA,

            to:
              unrelatedB,

            rawValue:
              "1",
          },
        ];

    const result =
      rankEvmWalletGraphNeighbors(
        root,
        observations
      );

    assert.equal(
      result.length,
      2
    );

    assert.equal(
      result[0]?.address,
      walletB
    );

    assert.equal(
      result[0]
        ?.evidenceObservationCount,
      2
    );

    assert.equal(
      result[0]
        ?.evidenceTransactionCount,
      2
    );

    assert.deepEqual(
      result[0]
        ?.observedTokenAddresses,
      [
        token,
      ]
    );

    assert.equal(
      result[1]?.address,
      walletC
    );
  }
);

test(
  "rejects invalid focal address",
  () => {
    assert.throws(
      () =>
        rankEvmWalletGraphNeighbors(
          "invalid",
          []
        ),

      /Invalid EVM graph focal address/
    );
  }
);
