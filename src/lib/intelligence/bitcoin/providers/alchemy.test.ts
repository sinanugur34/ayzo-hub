import assert from "node:assert/strict";
import test from "node:test";

import type {
  BitcoinNetworkContext,
} from "../types";

import {
  alchemyBitcoinProvider,
} from "./alchemy";

const NETWORK:
  BitcoinNetworkContext = {
    networkId:
      "bitcoin",

    name:
      "Bitcoin",

    nativeCurrency:
      "BTC",
  };

test(
  "normalizes canonical Bitcoin transaction and prevout evidence",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ALCHEMY_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
        "test-key";

    const rootHash =
      "A".repeat(64);

    const prevHash =
      "D".repeat(64);

    const methods:
      string[] = [];

    globalThis.fetch =
      (async (
        _input:
          string | URL | Request,

        init?:
          RequestInit
      ) => {
        const body =
          JSON.parse(
            String(
              init?.body
            )
          ) as {
            method:
              string;

            params:
              unknown[];
          };

        methods.push(
          body.method
        );

        const requestedHash =
          String(
            body.params[0]
          ).toLowerCase();

        if (
          requestedHash ===
          rootHash
            .toLowerCase()
        ) {
          return new Response(
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                1,

              result: {
                txid:
                  rootHash,

                hash:
                  "B".repeat(
                    64
                  ),

                blockhash:
                  "C".repeat(
                    64
                  ),

                confirmations:
                  7,

                vin: [
                  {
                    txid:
                      prevHash,

                    vout:
                      1,
                  },
                ],

                vout: [
                  {
                    value:
                      0.00001234,

                    n:
                      0,

                    scriptPubKey: {
                      hex:
                        "0014abcd",
                    },
                  },
                ],
              },
            }),

            {
              status:
                200,

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        if (
          requestedHash ===
          prevHash
            .toLowerCase()
        ) {
          return new Response(
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                1,

              result: {
                txid:
                  prevHash,

                vout: [
                  {
                    value:
                      0.5,

                    n:
                      0,

                    scriptPubKey: {
                      hex:
                        "00140000",
                    },
                  },

                  {
                    value:
                      1.25,

                    n:
                      1,

                    scriptPubKey: {
                      hex:
                        "76a914abcd88ac",
                    },
                  },
                ],
              },
            }),

            {
              status:
                200,

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        throw new Error(
          "Unexpected transaction hash."
        );
      }) as typeof fetch;

    try {
      const result =
        await alchemyBitcoinProvider
          .getTransactionEvidence({
            network:
              NETWORK,

            transactionHash:
              rootHash,
          });

      if (!result.ok) {
        throw new Error(
          result.error
        );
      }

      assert.equal(
        result.data
          .transactionHash,
        "a".repeat(64)
      );

      assert.equal(
        result.data
          .witnessHash,
        "b".repeat(64)
      );

      assert.equal(
        result.data
          .blockHash,
        "c".repeat(64)
      );

      assert.equal(
        result.data
          .confirmed,
        true
      );

      assert.equal(
        result.data
          .confirmations,
        7
      );

      assert.equal(
        result.data
          .inputs.length,
        1
      );

      assert.equal(
        result.data
          .inputs[0]
          ?.prevoutStatus,
        "resolved"
      );

      assert.equal(
        result.data
          .inputs[0]
          ?.prevout
          ?.valueSats,
        "125000000"
      );

      assert.equal(
        result.data
          .inputs[0]
          ?.prevout
          ?.scriptPubKey,
        "76a914abcd88ac"
      );

      assert.equal(
        result.data
          .outputs[0]
          ?.valueSats,
        "1234"
      );

      assert.equal(
        result.data
          .outputs[0]
          ?.index,
        0
      );

      assert.equal(
        result.data
          .prevoutCoverage
          .complete,
        true
      );

      assert.equal(
        result.data
          .prevoutCoverage
          .resolved,
        1
      );

      assert.deepEqual(
        methods,
        [
          "getrawtransaction",
          "getrawtransaction",
        ]
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .ALCHEMY_API_KEY;
      } else {
        process.env
          .ALCHEMY_API_KEY =
            originalKey;
      }
    }
  }
);

test(
  "accepts coinbase input without prevout lookup",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ALCHEMY_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
        "test-key";

    let calls =
      0;

    globalThis.fetch =
      (async () => {
        calls += 1;

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result: {
              txid:
                "1".repeat(
                  64
                ),

              hash:
                "2".repeat(
                  64
                ),

              blockhash:
                "3".repeat(
                  64
                ),

              confirmations:
                100,

              vin: [
                {
                  coinbase:
                    "abcd",
                },
              ],

              vout: [
                {
                  value:
                    6.25,

                  n:
                    0,

                  scriptPubKey: {
                    hex:
                      "0014abcd",
                  },
                },
              ],
            },
          }),

          {
            status:
              200,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }) as typeof fetch;

    try {
      const result =
        await alchemyBitcoinProvider
          .getTransactionEvidence({
            network:
              NETWORK,

            transactionHash:
              "1".repeat(
                64
              ),
          });

      if (!result.ok) {
        throw new Error(
          result.error
        );
      }

      assert.equal(
        calls,
        1
      );

      assert.equal(
        result.data
          .inputs[0]
          ?.prevoutStatus,
        "coinbase"
      );

      assert.equal(
        result.data
          .prevoutCoverage
          .eligible,
        0
      );

      assert.equal(
        result.data
          .prevoutCoverage
          .complete,
        true
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
        undefined
      ) {
        delete process.env
          .ALCHEMY_API_KEY;
      } else {
        process.env
          .ALCHEMY_API_KEY =
            originalKey;
      }
    }
  }
);

test(
  "rejects invalid Bitcoin transaction hash before provider access",
  async () => {
    const result =
      await alchemyBitcoinProvider
        .getTransactionEvidence({
          network:
            NETWORK,

          transactionHash:
            "not-a-hash",
        });

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      throw new Error(
        "Invalid transaction hash unexpectedly passed."
      );
    }

    assert.equal(
      result.code,
      "INVALID_TRANSACTION_HASH"
    );
  }
);

test(
  "declares Bitcoin RPC capability only",
  () => {
    assert.equal(
      alchemyBitcoinProvider
        .supportsNetwork(
          NETWORK
        ),
      true
    );

    assert.equal(
      alchemyBitcoinProvider
        .supportsCapability(
          "rpc"
        ),
      true
    );

    assert.equal(
      alchemyBitcoinProvider
        .supportsCapability(
          "transactions"
        ),
      false
    );
  }
);

test(
  "normalizes explicit Bitcoin script addresses without inferring them",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalKey =
      process.env
        .ALCHEMY_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "test-key";

    const rootHash =
      "9".repeat(64);

    const prevHash =
      "8".repeat(64);

    globalThis.fetch =
      (async (
        _input,
        init
      ) => {
        const body =
          JSON.parse(
            String(
              init?.body
            )
          ) as {
            method:
              string;

            params:
              unknown[];
          };

        const requested =
          String(
            body.params[0]
          );

        if (
          requested ===
            rootHash
        ) {
          return new Response(
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                1,

              result: {
                txid:
                  rootHash,

                hash:
                  rootHash,

                confirmations:
                  1,

                vin: [
                  {
                    txid:
                      prevHash,

                    vout:
                      0,
                  },
                ],

                vout: [
                  {
                    n:
                      0,

                    value:
                      0.001,

                    scriptPubKey: {
                      hex:
                        "76a914",

                      address:
                        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
                    },
                  },
                ],
              },
            }),
            {
              status:
                200,

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              2,

            result: {
              txid:
                prevHash,

              hash:
                prevHash,

              confirmations:
                2,

              vin: [
                {
                  coinbase:
                    "abcd",
                },
              ],

              vout: [
                {
                  n:
                    0,

                  value:
                    0.002,

                  scriptPubKey: {
                    hex:
                      "0014abcd",

                    addresses: [
                      "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
                    ],
                  },
                },
              ],
            },
          }),
          {
            status:
              200,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }) as typeof fetch;

    try {
      const result =
        await alchemyBitcoinProvider
          .getTransactionEvidence({
            network:
              NETWORK,

            transactionHash:
              rootHash,
          });

      assert.equal(
        result.ok,
        true
      );

      if (!result.ok) {
        assert.fail(
          "Expected successful Bitcoin canonical evidence."
        );
      }

      assert.deepEqual(
        result.data
          .outputs[0]
          ?.addresses,
        [
          "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
        ]
      );

      assert.deepEqual(
        result.data
          .inputs[0]
          ?.prevout
          ?.addresses,
        [
          "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        ]
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      if (
        originalKey ===
          undefined
      ) {
        delete process.env
          .ALCHEMY_API_KEY;
      } else {
        process.env
          .ALCHEMY_API_KEY =
          originalKey;
      }
    }
  }
);
