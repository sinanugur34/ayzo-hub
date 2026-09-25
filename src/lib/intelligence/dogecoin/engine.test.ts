import assert from "node:assert/strict";
import test from "node:test";

import {
  runDogecoinIntelligence,
  type DogecoinEngineDependencies,
} from "./engine";

const ADDRESS =
  "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L";

const HASH =
  "a".repeat(64);

const PREVIOUS_HASH =
  "b".repeat(64);

const BLOCK_HASH =
  "c".repeat(64);

const HISTORY = {
  transactions: [
    {
      transactionHash: HASH,
      blockHeight: null,
      timestamp: null,
    },
  ],
  nextCursor: "2",
} as const;

const EVIDENCE = {
  transactionHash: HASH,
  blockHash: BLOCK_HASH,
  blockHeight: 6170356,
  confirmed: true,
  confirmations: 12,
  timestamp:
    "2026-04-18T04:13:01.000Z",
  valueKoinu:
    "500000000",
  valueInKoinu:
    "510000000",
  feesKoinu:
    "10000000",
  inputs: [
    {
      previousTransactionHash:
        PREVIOUS_HASH,
      previousOutputIndex: 0,
      valueKoinu:
        "510000000",
      addresses: [
        ADDRESS,
      ],
      coinbase: false,
    },
  ],
  outputs: [
    {
      index: 0,
      valueKoinu:
        "500000000",
      scriptHex:
        "76a91400",
      addresses: [
        ADDRESS,
      ],
    },
  ],
} as const;

test(
  "runs bounded Dogecoin history then verifies canonical evidence",
  async () => {
    let requestedLimit:
      number | undefined;

    let evidenceHash:
      string | null = null;

    const deps:
      DogecoinEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          assert.equal(
            request.network.networkId,
            "dogecoin"
          );

          requestedLimit =
            request.limit;

          return {
            ok: true,
            providerId:
              "alchemy",
            latencyMs: 10,
            data: HISTORY,
          };
        },

        async getTransactionEvidence(
          request
        ) {
          evidenceHash =
            request.transactionHash;

          return {
            ok: true,
            providerId:
              "alchemy",
            latencyMs: 20,
            data: EVIDENCE,
          };
        },
      };

    const result =
      await runDogecoinIntelligence(
        {
          address: ADDRESS,
        },
        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (!result.data.ok) {
      assert.fail(
        result.data.error
      );
    }

    assert.equal(
      requestedLimit,
      5
    );

    assert.equal(
      evidenceHash,
      HASH
    );

    assert.equal(
      result.data.coverage,
      "partial"
    );

    assert.equal(
      result.data
        .canonicalTransaction
        ?.transactionHash,
      HASH
    );

    assert.equal(
      result.data.modules
        .addressHistory.status,
      "complete"
    );

    assert.equal(
      result.data.modules
        .canonicalTransactionEvidence
        .status,
      "complete"
    );
  }
);

test(
  "degrades safely when canonical evidence is unavailable",
  async () => {
    const deps:
      DogecoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok: true,
            providerId:
              "alchemy",
            latencyMs: 10,
            data: HISTORY,
          };
        },

        async getTransactionEvidence() {
          return {
            ok: false,
            providerId:
              "alchemy",
            latencyMs: 20,
            code: "TIMEOUT",
            error:
              "Alchemy timeout.",
          };
        },
      };

    const result =
      await runDogecoinIntelligence(
        {
          address: ADDRESS,
        },
        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (!result.data.ok) {
      assert.fail(
        result.data.error
      );
    }

    assert.equal(
      result.data.coverage,
      "limited"
    );

    assert.equal(
      result.data
        .canonicalTransaction,
      null
    );

    assert.equal(
      result.data.modules
        .canonicalTransactionEvidence
        .status,
      "unavailable"
    );

    assert.equal(
      result.data.findings[0]
        ?.id,
      "dogecoin-canonical-evidence-unavailable"
    );
  }
);

test(
  "fails closed when Dogecoin history provider is unavailable",
  async () => {
    const deps:
      DogecoinEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok: false,
            providerId:
              "alchemy",
            latencyMs: 10,
            code:
              "UPSTREAM_ERROR",
            error:
              "Alchemy unavailable.",
          };
        },

        async getTransactionEvidence() {
          throw new Error(
            "Evidence provider must not run."
          );
        },
      };

    const result =
      await runDogecoinIntelligence(
        {
          address: ADDRESS,
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
      assert.fail(
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
  "rejects invalid Dogecoin address before provider work",
  async () => {
    let providerCalls =
      0;

    const deps:
      DogecoinEngineDependencies = {
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
      await runDogecoinIntelligence(
        {
          address:
            "not-dogecoin",
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

    if (result.data.ok) {
      assert.fail(
        "Invalid address unexpectedly succeeded."
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
  "uses Advanced Dogecoin analysis depth",
  async () => {
    let requestedLimit:
      number | undefined;

    const deps:
      DogecoinEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          requestedLimit =
            request.limit;

          return {
            ok: true,
            providerId:
              "alchemy",
            latencyMs:
              10,
            data: {
              transactions:
                [],
              nextCursor:
                null,
            },
          };
        },

        async getTransactionEvidence() {
          throw new Error(
            "Canonical provider must not run without history."
          );
        },
      };

    const result =
      await runDogecoinIntelligence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "advanced",
        },
        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (
      !result.data.ok
    ) {
      assert.fail(
        result.data.error
      );
    }

    assert.equal(
      requestedLimit,
      20
    );

    assert.equal(
      result.data.analysisPlan,
      "advanced"
    );
  }
);
test(
  "builds Dogecoin flow and counterparties from canonical samples",
  async () => {
    const target =
      ADDRESS;

    const source =
      "DSource1111111111111111111111111111";

    const destination =
      "DDestination111111111111111111111111";

    const hashes = [
      "1".repeat(64),
      "2".repeat(64),
      "3".repeat(64),
    ];

    const history = {
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
        "20",
    };

    const evidenceByHash =
      new Map([
        [
          hashes[0],
          {
            transactionHash:
              hashes[0],

            blockHash:
              null,

            blockHeight:
              1,

            confirmed:
              true,

            confirmations:
              10,

            timestamp:
              "2026-01-03T00:00:00Z",

            valueKoinu:
              "500000000",

            valueInKoinu:
              "500000000",

            feesKoinu:
              "0",

            inputs: [
              {
                previousTransactionHash:
                  "a".repeat(64),

                previousOutputIndex:
                  0,

                valueKoinu:
                  "500000000",

                addresses: [
                  source,
                ],

                coinbase:
                  false,
              },
            ],

            outputs: [
              {
                index:
                  0,

                valueKoinu:
                  "500000000",

                scriptHex:
                  null,

                addresses: [
                  target,
                ],
              },
            ],
          },
        ],

        [
          hashes[1],
          {
            transactionHash:
              hashes[1],

            blockHash:
              null,

            blockHeight:
              2,

            confirmed:
              true,

            confirmations:
              9,

            timestamp:
              "2026-01-02T00:00:00Z",

            valueKoinu:
              "300000000",

            valueInKoinu:
              "300000000",

            feesKoinu:
              "0",

            inputs: [
              {
                previousTransactionHash:
                  "b".repeat(64),

                previousOutputIndex:
                  0,

                valueKoinu:
                  "300000000",

                addresses: [
                  target,
                ],

                coinbase:
                  false,
              },
            ],

            outputs: [
              {
                index:
                  0,

                valueKoinu:
                  "200000000",

                scriptHex:
                  null,

                addresses: [
                  destination,
                ],
              },

              {
                index:
                  1,

                valueKoinu:
                  "100000000",

                scriptHex:
                  null,

                addresses: [
                  target,
                ],
              },
            ],
          },
        ],

        [
          hashes[2],
          {
            transactionHash:
              hashes[2],

            blockHash:
              null,

            blockHeight:
              3,

            confirmed:
              true,

            confirmations:
              8,

            timestamp:
              "2026-01-01T00:00:00Z",

            valueKoinu:
              "100000000",

            valueInKoinu:
              "100000000",

            feesKoinu:
              "0",

            inputs: [
              {
                previousTransactionHash:
                  "c".repeat(64),

                previousOutputIndex:
                  0,

                valueKoinu:
                  "100000000",

                addresses: [
                  target,
                ],

                coinbase:
                  false,
              },
            ],

            outputs: [
              {
                index:
                  0,

                valueKoinu:
                  "100000000",

                scriptHex:
                  null,

                addresses: [
                  target,
                ],
              },
            ],
          },
        ],
      ]);

    const deps:
      DogecoinEngineDependencies = {
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
              "alchemy",

            latencyMs:
              1,

            data:
              history,
          };
        },

        async getTransactionEvidence(
          request
        ) {
          const evidence =
            evidenceByHash.get(
              request.transactionHash
            );

          assert.ok(
            evidence
          );

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
      await runDogecoinIntelligence(
        {
          address:
            target,

          analysisPlan:
            "advanced",
        },
        deps
      );

    assert.equal(
      result.status,
      200
    );

    if (
      !result.data.ok
    ) {
      assert.fail(
        result.data.error
      );
    }

    assert.equal(
      result.data.canonicalTransactions.length,
      3
    );

    assert.equal(
      result.data.derived.flow.incomingTransactionCount,
      1
    );

    assert.equal(
      result.data.derived.flow.outgoingTransactionCount,
      1
    );

    assert.equal(
      result.data.derived.flow.selfTransactionCount,
      1
    );

    assert.equal(
      result.data.derived.flow.incomingKoinu,
      "500000000"
    );

    assert.equal(
      result.data.derived.counterparties.count,
      2
    );

    assert.equal(
      result.data.derived.observedFunding?.sourceAddress,
      source
    );

    assert.equal(
      result.data.derived.canonicalCoverage.verified,
      3
    );
  }
);