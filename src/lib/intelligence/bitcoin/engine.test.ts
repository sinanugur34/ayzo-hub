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

test(
  "rejects invalid Bitcoin address before provider work",
  async () => {
    let providerCalls =
      0;

    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          providerCalls += 1;

          throw new Error(
            "History provider must not run."
          );
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
            "not-bitcoin",
        },

        deps
      );

    assert.equal(
      result.status,
      400
    );

    if (result.data.ok) {
      throw new Error(
        "Invalid Bitcoin address unexpectedly passed."
      );
    }

    assert.equal(
      result.data.code,
      "INVALID_ADDRESS"
    );

    assert.equal(
      providerCalls,
      0
    );
  }
);


test(
  "Bitcoin V2 verifies multiple canonical samples for paid plans",
  async () => {
    const hashes = [
      "a".repeat(64),
      "b".repeat(64),
      "c".repeat(64),
    ];

    let calls =
      0;

    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          assert.equal(
            request.limit,
            20
          );

          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              1,

            data: {
              transactions:
                hashes.map(
                  (
                    transactionHash,
                    index
                  ) => ({
                    transactionHash,
                    blockHeight:
                      100 + index,

                    timestamp:
                      `2026-09-0${index + 1}T00:00:00.000Z`,
                  })
                ),

              nextCursor:
                null,
            },
          };
        },

        async getTransactionEvidence(
          request
        ) {
          calls +=
            1;

          return {
            ok:
              true,

            providerId:
              "alchemy",

            latencyMs:
              1,

            data: {
              ...EVIDENCE,

              transactionHash:
                request
                  .transactionHash
                  .toLowerCase(),
            },
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

          analysisPlan:
            "advanced",
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
      calls,
      3
    );

    assert.equal(
      result.data
        .canonicalTransactions
        .length,
      3
    );

    assert.equal(
      result.data
        .derived
        .canonicalCoverage
        .verified,
      3
    );
  }
);

test(
  "Bitcoin V2 derives explicit flow counterparties and observed funding",
  async () => {
    const target =
      "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";

    const source =
      "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";

    const evidence = {
      ...EVIDENCE,

      inputs: [
        {
          previousTransactionHash:
            PREV_HASH,

          previousOutputIndex:
            0,

          prevout: {
            valueSats:
              "150000",

            scriptPubKey:
              "76a914",

            addresses: [
              source,
            ],
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
            "100000",

          scriptPubKey:
            "76a914",

          addresses: [
            target,
          ],
        },

        {
          index:
            1,

          valueSats:
            "49000",

          scriptPubKey:
            "76a914",

          addresses: [
            source,
          ],
        },
      ],
    };

    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              1,

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
              1,

            data:
              evidence,
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            target,
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
      result.data
        .derived
        .flow
        .incomingTransactionCount,
      1
    );

    assert.equal(
      result.data
        .derived
        .flow
        .incomingSats,
      "100000"
    );

    assert.equal(
      result.data
        .derived
        .counterparties
        .count,
      1
    );

    assert.equal(
      result.data
        .derived
        .observedFunding
        ?.sourceAddress,
      source
    );

    assert.equal(
      result.data
        .modules
        .funding
        .status,
      "limited"
    );
  }
);

test(
  "Bitcoin V2 degrades per-sample without discarding verified canonical evidence",
  async () => {
    const hashes = [
      "a".repeat(64),
      "b".repeat(64),
    ];

    let calls =
      0;

    const deps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              1,

            data: {
              transactions:
                hashes.map(
                  transactionHash => ({
                    transactionHash,
                    blockHeight:
                      null,

                    timestamp:
                      null,
                  })
                ),

              nextCursor:
                null,
            },
          };
        },

        async getTransactionEvidence(
          request
        ) {
          calls +=
            1;

          if (
            request
              .transactionHash ===
            hashes[1]
          ) {
            return {
              ok:
                false,

              providerId:
                "alchemy",

              latencyMs:
                1,

              code:
                "TIMEOUT",

              error:
                "timeout",
            };
          }

          return {
            ok:
              true,

            providerId:
              "alchemy",

            latencyMs:
              1,

            data: {
              ...EVIDENCE,

              transactionHash:
                request
                  .transactionHash,
            },
          };
        },
      };

    const result =
      await runBitcoinIntelligence(
        {
          address:
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",

          analysisPlan:
            "pro",
        },

        deps
      );

    assert.equal(
      calls,
      2
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
      result.data
        .canonicalTransactions
        .length,
      1
    );

    assert.equal(
      result.data
        .derived
        .canonicalCoverage
        .unavailable,
      1
    );

    assert.equal(
      result.data
        .modules
        .canonicalTransactionEvidence
        .status,
      "limited"
    );
  }
);

test(
  "Bitcoin V2 distinguishes fully unavailable canonical evidence from partial coverage",
  async () => {
    const address =
      "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";

    const hashes = [
      "d".repeat(64),
      "e".repeat(64),
    ];

    const unavailableDeps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              1,

            data: {
              transactions: [
                {
                  transactionHash:
                    hashes[0],

                  blockHeight:
                    null,

                  timestamp:
                    null,
                },
              ],

              nextCursor:
                null,
            },
          };
        },

        async getTransactionEvidence() {
          return {
            ok:
              false,

            providerId:
              "alchemy",

            latencyMs:
              1,

            code:
              "TIMEOUT",

            error:
              "timeout",
          };
        },
      };

    const unavailable =
      await runBitcoinIntelligence(
        {
          address,
          analysisPlan:
            "free",
        },

        unavailableDeps
      );

    assert.equal(
      unavailable.status,
      200
    );

    if (!unavailable.data.ok) {
      throw new Error(
        unavailable.data.error
      );
    }

    assert.equal(
      unavailable.data
        .canonicalTransactions
        .length,
      0
    );

    assert.equal(
      unavailable.data
        .modules
        .canonicalTransactionEvidence
        .status,
      "unavailable"
    );

    assert.equal(
      unavailable.data
        .findings
        .some(
          finding =>
            finding.id ===
            "bitcoin-canonical-evidence-unavailable"
        ),
      true
    );

    const partialDeps:
      BitcoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok:
              true,

            providerId:
              "goldrush",

            latencyMs:
              1,

            data: {
              transactions:
                hashes.map(
                  transactionHash => ({
                    transactionHash,
                    blockHeight:
                      null,

                    timestamp:
                      null,
                  })
                ),

              nextCursor:
                null,
            },
          };
        },

        async getTransactionEvidence(
          request
        ) {
          if (
            request
              .transactionHash ===
            hashes[1]
          ) {
            return {
              ok:
                false,

              providerId:
                "alchemy",

              latencyMs:
                1,

              code:
                "TIMEOUT",

              error:
                "timeout",
            };
          }

          return {
            ok:
              true,

            providerId:
              "alchemy",

            latencyMs:
              1,

            data: {
              ...EVIDENCE,

              transactionHash:
                request
                  .transactionHash,
            },
          };
        },
      };

    const partial =
      await runBitcoinIntelligence(
        {
          address,
          analysisPlan:
            "pro",
        },

        partialDeps
      );

    assert.equal(
      partial.status,
      200
    );

    if (!partial.data.ok) {
      throw new Error(
        partial.data.error
      );
    }

    assert.equal(
      partial.data
        .canonicalTransactions
        .length,
      1
    );

    assert.equal(
      partial.data
        .modules
        .canonicalTransactionEvidence
        .status,
      "limited"
    );

    assert.equal(
      partial.data
        .findings
        .some(
          finding =>
            finding.id ===
            "bitcoin-canonical-evidence-partial"
        ),
      true
    );
  }
);
