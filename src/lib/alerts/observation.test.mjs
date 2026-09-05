import test from "node:test";
import assert from "node:assert/strict";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  extractBitcoinActivityEvidence,
  extractEvmActivityEvidence,
} = require("./observation.ts");


test(
  "EVM Activity Timeline produces supported transaction evidence",
  () => {
    const result =
      extractEvmActivityEvidence({
        network:
          "ethereum",

        data: {
          activityTimeline: {
            items: [
              {
                transactionHash:
                  "0xABC",

                timestamp:
                  "2026-09-05T10:00:00.000Z",
              },

              {
                transactionHash:
                  "0xDEF",

                evidenceState:
                  "INFERRED",
              },
            ],
          },
        },
      });

    assert.equal(
      result.available,
      true
    );

    assert.equal(
      result.evidence.length,
      1
    );

    assert.equal(
      result.evidence[0]
        .reference,
      "evm-tx:0xabc"
    );
  }
);


test(
  "missing EVM Activity Timeline fails closed",
  () => {
    const result =
      extractEvmActivityEvidence({
        network:
          "ethereum",

        data: {
          ok:
            true,
        },
      });

    assert.equal(
      result.available,
      false
    );

    assert.deepEqual(
      result.evidence,
      []
    );
  }
);


test(
  "empty but available timeline is valid baseline evidence",
  () => {
    const result =
      extractEvmActivityEvidence({
        network:
          "base",

        data: {
          activityTimeline: {
            events:
              [],
          },
        },
      });

    assert.equal(
      result.available,
      true
    );

    assert.deepEqual(
      result.evidence,
      []
    );
  }
);


test(
  "Bitcoin canonical history is supported transaction evidence",
  () => {
    const result =
      extractBitcoinActivityEvidence({
        data: {
          history: {
            transactions: [
              {
                transactionHash:
                  "ABC123",
              },

              {
                transactionHash:
                  "ABC123",
              },

              {
                transactionHash:
                  "DEF456",
              },
            ],
          },
        },
      });

    assert.equal(
      result.available,
      true
    );

    assert.equal(
      result.evidence.length,
      2
    );

    assert.equal(
      result.evidence[0]
        .reference,
      "bitcoin-tx:abc123"
    );
  }
);


test(
  "missing Bitcoin canonical evidence fails closed",
  () => {
    const result =
      extractBitcoinActivityEvidence({
        data: {
          ok:
            true,
        },
      });

    assert.equal(
      result.available,
      false
    );
  }
);
