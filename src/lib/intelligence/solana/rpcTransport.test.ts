import assert from "node:assert/strict";
import test from "node:test";

import {
  solanaRpcCall,
} from "./rpcTransport";

function restore(
  name:
    "ALCHEMY_API_KEY" |
    "HELIUS_API_KEY",

  value:
    string |
    undefined
) {
  if (
    value ===
      undefined
  ) {
    delete process.env[
      name
    ];

    return;
  }

  process.env[
    name
  ] =
    value;
}

test(
  "Solana RPC uses Alchemy before Helius",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalAlchemy =
      process.env
        .ALCHEMY_API_KEY;

    const originalHelius =
      process.env
        .HELIUS_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "alchemy-test";

    process.env
      .HELIUS_API_KEY =
      "helius-test";

    const urls:
      string[] =
      [];

    globalThis.fetch =
      async input => {
        urls.push(
          String(
            input
          )
        );

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result:
              "alchemy",
          }),

          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        );
      };

    try {
      assert.equal(
        await solanaRpcCall(
          "getHealth",
          []
        ),
        "alchemy"
      );

      assert.equal(
        urls.length,
        1
      );

      assert.match(
        urls[0],
        /solana-mainnet\.g\.alchemy\.com/
      );

      assert.doesNotMatch(
        urls[0],
        /helius-rpc/
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restore(
        "ALCHEMY_API_KEY",
        originalAlchemy
      );

      restore(
        "HELIUS_API_KEY",
        originalHelius
      );
    }
  }
);

test(
  "Solana RPC falls back to Helius after Alchemy upstream failure",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalAlchemy =
      process.env
        .ALCHEMY_API_KEY;

    const originalHelius =
      process.env
        .HELIUS_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "alchemy-test";

    process.env
      .HELIUS_API_KEY =
      "helius-test";

    const urls:
      string[] =
      [];

    globalThis.fetch =
      async input => {
        const url =
          String(
            input
          );

        urls.push(
          url
        );

        if (
          url.includes(
            "alchemy.com"
          )
        ) {
          return new Response(
            "temporary upstream failure",
            {
              status:
                503,
            }
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result:
              "helius",
          }),

          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        );
      };

    try {
      assert.equal(
        await solanaRpcCall(
          "getHealth",
          []
        ),
        "helius"
      );

      assert.equal(
        urls.length,
        2
      );

      assert.match(
        urls[0],
        /alchemy\.com/
      );

      assert.match(
        urls[1],
        /helius-rpc\.com/
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restore(
        "ALCHEMY_API_KEY",
        originalAlchemy
      );

      restore(
        "HELIUS_API_KEY",
        originalHelius
      );
    }
  }
);

test(
  "Solana RPC works with Alchemy as only configured provider",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalAlchemy =
      process.env
        .ALCHEMY_API_KEY;

    const originalHelius =
      process.env
        .HELIUS_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "alchemy-test";

    delete process.env
      .HELIUS_API_KEY;

    globalThis.fetch =
      async () =>
        new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            result:
              123,
          }),

          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        );

    try {
      assert.equal(
        await solanaRpcCall(
          "getSlot",
          []
        ),
        123
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restore(
        "ALCHEMY_API_KEY",
        originalAlchemy
      );

      restore(
        "HELIUS_API_KEY",
        originalHelius
      );
    }
  }
);

test(
  "invalid JSON RPC params never fall back to another provider",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const originalAlchemy =
      process.env
        .ALCHEMY_API_KEY;

    const originalHelius =
      process.env
        .HELIUS_API_KEY;

    process.env
      .ALCHEMY_API_KEY =
      "alchemy-test";

    process.env
      .HELIUS_API_KEY =
      "helius-test";

    let requests =
      0;

    globalThis.fetch =
      async () => {
        requests +=
          1;

        return new Response(
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              1,

            error: {
              code:
                -32602,

              message:
                "Invalid params",
            },
          }),

          {
            status:
              200,

            headers: {
              "content-type":
                "application/json",
            },
          }
        );
      };

    try {
      await assert.rejects(
        () =>
          solanaRpcCall(
            "badMethod",
            []
          ),

        /Invalid params/
      );

      assert.equal(
        requests,
        1
      );
    } finally {
      globalThis.fetch =
        originalFetch;

      restore(
        "ALCHEMY_API_KEY",
        originalAlchemy
      );

      restore(
        "HELIUS_API_KEY",
        originalHelius
      );
    }
  }
);
