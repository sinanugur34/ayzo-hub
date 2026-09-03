import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmCoordinatedWalletBehavior,
  type EvmCoordinationCoverage,
  type EvmCoordinationObservation,
} from "./coordinatedWalletBehavior";

const walletA =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const funder =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const counterparty =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const unrelated =
  "0xcccccccccccccccccccccccccccccccccccccccc";

const token =
  "0xdddddddddddddddddddddddddddddddddddddddd";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

const coverage:
  EvmCoordinationCoverage = {
  includesEvmTransactions:
    true,

  includesErc20Transfers:
    true,

  includesSharedFunding:
    true,

  includesSharedCounterparties:
    true,

  includesDirectInteractions:
    true,

  includesSameTransaction:
    true,

  includesSharedTokenActivity:
    true,

  includesTemporalCorrelation:
    false,

  includesOwnershipInference:
    false,

  limitation:
    "Temporal correlation and ownership inference are not included.",
};

test(
  "builds deterministic evidence-first coordination signals",
  () => {
    const observations:
      EvmCoordinationObservation[] =
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
              funder,

            to:
              walletA,

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
              funder,

            to:
              walletB,

            rawValue:
              "200",
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
              counterparty,

            rawValue:
              "0",
          },

          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("4"),

            blockNumber:
              103,

            timestamp:
              "2026-01-01T00:03:00Z",

            from:
              walletB,

            to:
              counterparty,

            rawValue:
              "0",
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
              walletA,

            to:
              walletB,

            rawValue:
              "50",
          },

          {
            kind:
              "erc20_transfer",

            transactionHash:
              hash("6"),

            blockNumber:
              105,

            timestamp:
              "2026-01-01T00:05:00Z",

            from:
              counterparty,

            to:
              walletA,

            tokenAddress:
              token,

            rawValue:
              "10",
          },

          {
            kind:
              "erc20_transfer",

            transactionHash:
              hash("7"),

            blockNumber:
              106,

            timestamp:
              "2026-01-01T00:06:00Z",

            from:
              walletB,

            to:
              unrelated,

            tokenAddress:
              token,

            rawValue:
              "20",
          },

          // Exact duplicate:
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
              funder,

            to:
              walletA,

            rawValue:
              "100",
          },

          // Unrelated evidence:
          {
            kind:
              "evm_transaction",

            transactionHash:
              hash("8"),

            blockNumber:
              107,

            timestamp:
              "2026-01-01T00:07:00Z",

            from:
              unrelated,

            to:
              funder,

            rawValue:
              "1",
          },
        ];

    const result =
      analyzeEvmCoordinatedWalletBehavior({
        walletAddresses: [
          walletB,
          walletA,
        ],

        observations,

        coverage,
      });

    assert.deepEqual(
      result.targetWallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.equal(
      result.duplicateEvidenceCount,
      1
    );

    assert.equal(
      result.ignoredEvidenceCount,
      1
    );

    const sharedFunder =
      result.signals.find(
        signal =>
          signal.kind ===
            "shared_funder" &&
          signal.externalAddress ===
            funder
      );

    assert.ok(
      sharedFunder
    );

    assert.deepEqual(
      sharedFunder.wallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.deepEqual(
      sharedFunder
        .evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
      ]
    );

    const sharedCounterparty =
      result.signals.find(
        signal =>
          signal.kind ===
            "shared_counterparty" &&
          signal.externalAddress ===
            counterparty
      );

    assert.ok(
      sharedCounterparty
    );

    assert.deepEqual(
      sharedCounterparty.wallets,
      [
        walletA,
        walletB,
      ]
    );

    const direct =
      result.signals.find(
        signal =>
          signal.kind ===
          "direct_interaction"
      );

    assert.ok(direct);

    assert.deepEqual(
      direct.wallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.deepEqual(
      direct
        .evidenceTransactionHashes,
      [
        hash("5"),
      ]
    );

    const sameTransaction =
      result.signals.find(
        signal =>
          signal.kind ===
          "same_transaction"
      );

    assert.ok(
      sameTransaction
    );

    assert.deepEqual(
      sameTransaction.wallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.deepEqual(
      sameTransaction
        .evidenceTransactionHashes,
      [
        hash("5"),
      ]
    );

    const sharedToken =
      result.signals.find(
        signal =>
          signal.kind ===
            "shared_token_activity" &&
          signal.tokenAddress ===
            token
      );

    assert.ok(
      sharedToken
    );

    assert.deepEqual(
      sharedToken.wallets,
      [
        walletA,
        walletB,
      ]
    );

    assert.equal(
      result.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      result.coverage
        .includesTemporalCorrelation,
      false
    );

    assert.ok(
      result.signalCount >=
        5
    );
  }
);

test(
  "requires at least two unique valid target wallets",
  () => {
    assert.throws(
      () =>
        analyzeEvmCoordinatedWalletBehavior({
          walletAddresses: [
            walletA,
            walletA,
          ],

          observations: [],

          coverage,
        }),

      /Expected between 2 and 10/
    );
  }
);
