import assert from "node:assert/strict";
import test from "node:test";

import type {
  BitcoinEngineDependencies,
} from "./engine";

import {
  runBitcoinIntelligence,
} from "./engine";

const HASH =
  "a".repeat(64);

const PREV_HASH =
  "b".repeat(64);

const HISTORY = {
  transactions: [
    {
      transactionHash:
        HASH,

      blockHeight:
        965000,

      timestamp:
        "2026-09-03T10:00:00.000Z",
    },
  ],

  nextCursor:
    "1",
} as const;

const EVIDENCE = {
  transactionHash:
    HASH,

  witnessHash:
    "c".repeat(64),

  blockHash:
    "d".repeat(64),

  confirmed:
    true,

  confirmations:
    10,

  inputs: [
    {
      previousTransactionHash:
        PREV_HASH,

      previousOutputIndex:
        0,

      prevout: {
        valueSats:
          "100000",

        scriptPubKey:
          "0014abcd",
      },

      prevoutStatus:
        "resolved" as const,
    },
  ],

  outputs: [
    {
      index:
        0,

      valueSats:
        "90000",

      scriptPubKey:
        "0014dcba",
    },
  ],

  prevoutCoverage: {
    eligible:
      1,

    attempted:
      1,

    resolved:
      1,

    unavailable:
      0,

    omitted:
      0,

    complete:
      true,
  },
} as const;

test(
  "orchestrates GoldRush history into canonical Alchemy evidence",
  async () => {
    let evidenceHash:
      string | null = null;

    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          assert.equal(
            request.network
              .networkId,
            "bitcoin"
          );

          assert.equal(
            request.limit,
            5
          );

          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              10,

            data:
              HISTORY,
          };
        },

        async getTransactionEvidence(
          request
        ) {
          evidenceHash =
            request
              .transactionHash;

          return {
            ok:
              true,

            providerId:
              "alchemy",

            latencyMs:
              20,

            data:
              EVIDENCE,
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        },

        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (!result.data.ok) {
      throw new Error(
        result.data.error
      );
    }

    assert.equal(
      result.data.ok,
      true
    );

    assert.equal(
      evidenceHash,
      HASH
    );

    assert.equal(
      result.data
        .canonicalTransaction
        ?.transactionHash,
      HASH
    );

    assert.equal(
      result.data
        .modules
        .addressHistory
        .status,
      "complete"
    );

    assert.equal(
      result.data
        .modules
        .canonicalTransactionEvidence
        .status,
      "complete"
    );

    assert.equal(
      result.data.coverage,
      "partial"
    );
  }
);

test(
  "degrades safely when canonical evidence provider is unavailable",
  async () => {
    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              10,

            data:
              HISTORY,
          };
        },

        async getTransactionEvidence() {
          return {
            ok:
              false,

            providerId:
              "alchemy",

            latencyMs:
              20,

            code:
              "TIMEOUT",

            error:
              "Alchemy timeout.",
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        },

        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (!result.data.ok) {
      throw new Error(
        result.data.error
      );
    }

    assert.equal(
      result.data.ok,
      true
    );

    assert.equal(
      result.data
        .coverage,
      "limited"
    );

    assert.equal(
      result.data
        .canonicalTransaction,
      null
    );

    assert.equal(
      result.data
        .modules
        .canonicalTransactionEvidence
        .status,
      "unavailable"
    );

    assert.equal(
      result.data
        .findings[0]
        ?.id,
      "bitcoin-canonical-evidence-unavailable"
    );
  }
);

test(
  "fails closed when history provider is unavailable",
  async () => {
    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              false,

            providerId:
              "goldrush",

            latencyMs:
              10,

            code:
              "UPSTREAM_ERROR",

            error:
              "GoldRush unavailable.",
          };
        },

        async getTransactionEvidence() {
          throw new Error(
            "Evidence provider must not run."
          );
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        },

        deps
      );

    assert.equal(
      result.status,
      502
    );

    assert.equal(
      result.data.ok,
      false
    );

    if (result.data.ok) {
      throw new Error(
        "History failure unexpectedly succeeded."
      );
    }

    assert.equal(
      result.data.code,
      "UPSTREAM_ERROR"
    );
  }
);

test(
  "rejects mismatched canonical transaction evidence",
  async () => {
    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              10,

            data:
              HISTORY,
          };
        },

        async getTransactionEvidence() {
          return {
            ok:
              true,

            providerId:
              "alchemy",

            latencyMs:
              20,

            data: {
              ...EVIDENCE,

              transactionHash:
                "f".repeat(
                  64
                ),
            },
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        },

        deps
      );

    assert.equal(
      result.status,
      502
    );

    assert.equal(
      result.data.ok,
      false
    );
  }
);
