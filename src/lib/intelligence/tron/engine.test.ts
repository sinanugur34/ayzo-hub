import assert from "node:assert/strict";
import test from "node:test";

import {
  runTronIntelligence,
  type TronEngineDependencies,
} from "./engine";

const ADDRESS =
  "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8";

const HASH =
  "a".repeat(64);

const OTHER_HASH =
  "b".repeat(64);

const HISTORY = {
  transactions: [
    {
      transactionHash:
        HASH,
      blockHeight:
        70000000,
      timestamp:
        "2026-04-18T04:13:01.000Z",
      confirmed:
        true,
    },
  ],
  nextCursor:
    "next-fingerprint",
} as const;

const EVIDENCE = {
  transactionHash:
    HASH,
  blockHeight:
    70000000,
  timestamp:
    "2026-04-18T04:13:01.000Z",
  confirmed:
    true,
  executionResult:
    "SUCCESS",
  feeSun:
    "1000",
  energyUsage:
    10,
  energyUsageTotal:
    20,
  energyFeeSun:
    "30",
  netUsage:
    40,
  netFeeSun:
    "50",
  contract:
    null,
  rawDataHex:
    null,
  signatureCount:
    1,
} as const;

test(
  "runs bounded TRON history then verifies canonical evidence",
  async () => {
    let requestedLimit:
      number | undefined;

    let evidenceHash:
      string | null =
        null;

    const deps:
      TronEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          assert.equal(
            request.network
              .networkId,
            "tron"
          );

          requestedLimit =
            request.limit;

          return {
            ok: true,
            providerId:
              "trongrid",
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
            ok: true,
            providerId:
              "trongrid",
            latencyMs:
              20,
            data:
              EVIDENCE,
          };
        },
      };

    const result =
      await runTronIntelligence(
        {
          address:
            ADDRESS,
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
        .addressHistory
        .status,
      "limited"
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
  "degrades safely when canonical TRON evidence is unavailable",
  async () => {
    const deps:
      TronEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok: true,
            providerId:
              "trongrid",
            latencyMs:
              10,
            data:
              HISTORY,
          };
        },

        async getTransactionEvidence() {
          return {
            ok: false,
            providerId:
              "trongrid",
            latencyMs:
              20,
            code:
              "TIMEOUT",
            error:
              "TronGrid timeout.",
          };
        },
      };

    const result =
      await runTronIntelligence(
        {
          address:
            ADDRESS,
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
  }
);

test(
  "fails closed when TRON history provider is unavailable",
  async () => {
    const deps:
      TronEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok: false,
            providerId:
              "trongrid",
            latencyMs:
              10,
            code:
              "UPSTREAM_ERROR",
            error:
              "TronGrid unavailable.",
          };
        },

        async getTransactionEvidence() {
          throw new Error(
            "Evidence provider must not run."
          );
        },
      };

    const result =
      await runTronIntelligence(
        {
          address:
            ADDRESS,
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
  "rejects invalid TRON address before provider work",
  async () => {
    let providerCalls = 0;

    const deps:
      TronEngineDependencies = {
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
      await runTronIntelligence(
        {
          address:
            "not-tron",
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
  "fails closed when canonical evidence hash does not match history",
  async () => {
    const deps:
      TronEngineDependencies = {
        async getAddressTransactions() {
          return {
            ok: true,
            providerId:
              "trongrid",
            latencyMs:
              10,
            data:
              HISTORY,
          };
        },

        async getTransactionEvidence() {
          return {
            ok: true,
            providerId:
              "trongrid",
            latencyMs:
              20,
            data: {
              ...EVIDENCE,
              transactionHash:
                OTHER_HASH,
            },
          };
        },
      };

    const result =
      await runTronIntelligence(
        {
          address:
            ADDRESS,
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
        "Hash mismatch unexpectedly succeeded."
      );
    }

    assert.equal(
      result.data.code,
      "UPSTREAM_ERROR"
    );
  }
);

test(
  "uses Advanced TRON analysis depth",
  async () => {
    let requestedLimit:
      number | undefined;

    const deps:
      TronEngineDependencies = {
        async getAddressTransactions(
          request
        ) {
          requestedLimit =
            request.limit;

          return {
            ok:
              true,

            providerId:
              "trongrid",

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
      await runTronIntelligence(
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

    assert.equal(
      result.data.evidenceCoverage.historyLimit,
      20
    );

    assert.equal(
      result.data.evidenceCoverage.canonicalSampleLimit,
      3
    );
  }
);
test(
  "builds TRON flow, funding, relationships and resource totals",
  async () => {
    const {
      tronAddressToHex,
    } =
      await import(
        "./address"
      );

    const targetHex =
      tronAddressToHex(
        ADDRESS
      );

    assert.ok(
      targetHex
    );

    const sourceHex =
      "41" +
      "1".repeat(
        40
      );

    const destinationHex =
      "41" +
      "2".repeat(
        40
      );

    const contractHex =
      "41" +
      "3".repeat(
        40
      );

    const hashes = [
      "1".repeat(64),
      "2".repeat(64),
      "3".repeat(64),
    ];

    const history = {
      transactions:
        hashes.map(
          (
            transactionHash,
            index
          ) => ({
            transactionHash,

            blockHeight:
              70000000 +
              index,

            timestamp:
              `2026-04-${18 - index}T04:13:01.000Z`,

            confirmed:
              true,
          })
        ),

      nextCursor:
        "next-page",
    };

    const evidenceByHash =
      new Map([
        [
          hashes[0],
          {
            ...EVIDENCE,

            transactionHash:
              hashes[0],

            feeSun:
              "100",

            energyFeeSun:
              "10",

            netFeeSun:
              "5",

            energyUsageTotal:
              20,

            netUsage:
              40,

            contract: {
              type:
                "TransferContract",

              ownerAddressHex:
                sourceHex,

              toAddressHex:
                targetHex,

              contractAddressHex:
                null,

              amountSun:
                "5000000",

              callValueSun:
                null,

              dataHex:
                null,
            },
          },
        ],

        [
          hashes[1],
          {
            ...EVIDENCE,

            transactionHash:
              hashes[1],

            feeSun:
              "200",

            energyFeeSun:
              "20",

            netFeeSun:
              "10",

            energyUsageTotal:
              30,

            netUsage:
              50,

            contract: {
              type:
                "TransferContract",

              ownerAddressHex:
                targetHex,

              toAddressHex:
                destinationHex,

              contractAddressHex:
                null,

              amountSun:
                "2000000",

              callValueSun:
                null,

              dataHex:
                null,
            },
          },
        ],

        [
          hashes[2],
          {
            ...EVIDENCE,

            transactionHash:
              hashes[2],

            feeSun:
              "300",

            energyFeeSun:
              "30",

            netFeeSun:
              "15",

            energyUsageTotal:
              40,

            netUsage:
              60,

            contract: {
              type:
                "TriggerSmartContract",

              ownerAddressHex:
                targetHex,

              toAddressHex:
                null,

              contractAddressHex:
                contractHex,

              amountSun:
                null,

              callValueSun:
                "1000000",

              dataHex:
                "aabb",
            },
          },
        ],
      ]);

    const deps:
      TronEngineDependencies = {
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
              "trongrid",

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
              "trongrid",

            latencyMs:
              1,

            data:
              evidence,
          };
        },
      };

    const result =
      await runTronIntelligence(
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
      result.data.canonicalTransactions.length,
      3
    );

    assert.equal(
      result.data.derived.flow.incomingTransactionCount,
      1
    );

    assert.equal(
      result.data.derived.flow.outgoingTransactionCount,
      2
    );

    assert.equal(
      result.data.derived.flow.contractInteractionCount,
      1
    );

    assert.equal(
      result.data.derived.flow.incomingSun,
      "5000000"
    );

    assert.equal(
      result.data.derived.flow.outgoingSun,
      "3000000"
    );

    assert.equal(
      result.data.derived.counterparties.count,
      3
    );

    assert.equal(
      result.data.derived.observedFunding?.sourceAddressHex,
      sourceHex
    );

    assert.equal(
      result.data.derived.resources.feeSun,
      "600"
    );

    assert.equal(
      result.data.derived.resources.energyUsageTotal,
      90
    );

    assert.equal(
      result.data.derived.resources.netUsage,
      150
    );

    assert.equal(
      result.data.derived.canonicalCoverage.verified,
      3
    );
  }
);