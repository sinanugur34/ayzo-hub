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
