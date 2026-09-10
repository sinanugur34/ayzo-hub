import assert from "node:assert/strict";
import test from "node:test";

import {
  AlchemyDogecoinRpcProvider,
} from "./alchemyRpc";

const NETWORK = {
  networkId: "dogecoin",
  name: "Dogecoin",
  nativeCurrency: "DOGE",
} as const;

const HASH = "a".repeat(64);
const BLOCK_HASH = "b".repeat(64);

test("parses canonical Dogecoin RPC transaction", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ALCHEMY_API_KEY;

  process.env.ALCHEMY_API_KEY = "test-doge-key";

  let requestedUrl = "";

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);

    const body = JSON.parse(
      String(init?.body)
    );

    assert.equal(
      body.method,
      "getrawtransaction"
    );

    assert.deepEqual(
      body.params,
      [HASH, true]
    );

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          txid: HASH,
          vin: [
            {
              coinbase: "abcd",
            },
          ],
          vout: [
            {
              value: 12.5,
              n: 0,
              scriptPubKey: {
                hex: "76a914",
                addresses: [
                  "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
                ],
              },
            },
          ],
          blockhash: BLOCK_HASH,
          confirmations: 10,
          blocktime: 1700000000,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  };

  try {
    const provider =
      new AlchemyDogecoinRpcProvider();

    const result =
      await provider.getTransactionEvidence({
        network: NETWORK,
        transactionHash: HASH,
      });

    assert.equal(result.ok, true);

    if (!result.ok) {
      assert.fail(
        "Alchemy RPC unexpectedly failed"
      );
    }

    assert.equal(
      requestedUrl,
      "https://dogecoin-mainnet.g.alchemy.com/v2/test-doge-key"
    );

    assert.equal(
      result.data.transactionHash,
      HASH
    );

    assert.equal(
      result.data.blockHash,
      BLOCK_HASH
    );

    assert.equal(
      result.data.confirmed,
      true
    );

    assert.equal(
      result.data.confirmations,
      10
    );

    assert.equal(
      result.data.inputs.length,
      1
    );

    assert.equal(
      result.data.outputs.length,
      1
    );

    assert.equal(
      result.data.outputs[0]?.valueKoinu,
      "1250000000"
    );
  } finally {
    globalThis.fetch = originalFetch;

    if (originalKey === undefined) {
      delete process.env.ALCHEMY_API_KEY;
    } else {
      process.env.ALCHEMY_API_KEY =
        originalKey;
    }
  }
});

test("rejects invalid hash before fetch", async () => {
  const originalFetch = globalThis.fetch;

  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("fetch must not run");
  };

  try {
    const provider =
      new AlchemyDogecoinRpcProvider();

    const result =
      await provider.getTransactionEvidence({
        network: NETWORK,
        transactionHash: "bad-hash",
      });

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.code,
        "INVALID_TRANSACTION_HASH"
      );
    }

    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maps HTTP 429 to RATE_LIMITED", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ALCHEMY_API_KEY;

  process.env.ALCHEMY_API_KEY = "test-doge-key";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "rate limited",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

  try {
    const provider =
      new AlchemyDogecoinRpcProvider();

    const result =
      await provider.getTransactionEvidence({
        network: NETWORK,
        transactionHash: HASH,
      });

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.code,
        "RATE_LIMITED"
      );
    }
  } finally {
    globalThis.fetch = originalFetch;

    if (originalKey === undefined) {
      delete process.env.ALCHEMY_API_KEY;
    } else {
      process.env.ALCHEMY_API_KEY =
        originalKey;
    }
  }
});
