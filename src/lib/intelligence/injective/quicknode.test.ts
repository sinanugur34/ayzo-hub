import assert from "node:assert/strict";
import test from "node:test";

import {
  Buffer,
} from "node:buffer";

import {
  getInjectiveQuickNodeRawHistory,
} from "./quicknode";

const ADDRESS =
  "inj14sph79aemnd0jsmgx0kpfl2tsutjfjaxwjf5x4";

test(
  "Injective QuickNode adapter normalizes GetAccountTxsV2 protobuf bytes",
  async () => {
    const messages = [
      {
        "@type":
          "/cosmos.bank.v1beta1.MsgSend",

        from_address:
          ADDRESS,

        to_address:
          "inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c",

        amount: [
          {
            denom:
              "inj",

            amount:
              "123",
          },
        ],
      },
    ];

    const result =
      await getInjectiveQuickNodeRawHistory(
        {
          grpcEndpoint:
            "unit-test.injective-mainnet.quiknode.pro:443",

          token:
            "unit-token",

          address:
            ADDRESS,

          limit:
            20,

          timeoutMs:
            2_000,
        },
        {
          rpcCall:
            async input => {
              assert.equal(
                input.address,
                ADDRESS
              );

              assert.equal(
                input.limit,
                20
              );

              return {
                paging: {
                  next: [
                    "cursor-1",
                  ],
                },

                data: [
                  {
                    blockNumber:
                      "185410442",

                    blockTimestamp:
                      "2026-10-01T12:00:00Z",

                    blockUnixTimestamp:
                      "1790856000000",

                    hash:
                      "0xabc",

                    code:
                      0,

                    messages:
                      Buffer.from(
                        JSON.stringify(
                          messages
                        )
                      ),
                  },
                ],
              };
            },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    const root =
      result.data as
        Record<
          string,
          unknown
        >;

    const data =
      root.data as
        Array<
          Record<
            string,
            unknown
          >
        >;

    assert.equal(
      data.length,
      1
    );

    assert.equal(
      data[0]
        ?.block_number,
      "185410442"
    );

    assert.deepEqual(
      data[0]
        ?.messages,
      messages
    );

    assert.deepEqual(
      (
        root.paging as
          Record<
            string,
            unknown
          >
      ).next,
      [
        "cursor-1",
      ]
    );
  }
);

test(
  "Injective QuickNode adapter rejects non-mainnet endpoint before RPC",
  async () => {
    let calls =
      0;

    const result =
      await getInjectiveQuickNodeRawHistory(
        {
          grpcEndpoint:
            "example.com:443",

          token:
            "unit-token",

          address:
            ADDRESS,

          limit:
            20,

          timeoutMs:
            2_000,
        },
        {
          rpcCall:
            async () => {
              calls +=
                1;

              return {};
            },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      calls,
      0
    );

    if (result.ok) {
      return;
    }

    assert.equal(
      result.code,
      "UPSTREAM_ERROR"
    );
  }
);
