import assert from "node:assert/strict";
import test from "node:test";

import {
  getXrplAccountEvidence,
} from "./publicRpc";

const TARGET =
  "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

function rpcResponse(
  result:
    Record<string, unknown>
) {
  return new Response(
    JSON.stringify({
      result,
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

test(
  "uses XRPL delivered_amount for API v2 payments",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async (
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
              readonly Record<
                string,
                unknown
              >[];
          };

        const params =
          body.params[0] ??
          {};

        if (
          body.method ===
          "account_info"
        ) {
          return rpcResponse({
            ledger_index:
              1000,

            account_data: {
              Balance:
                "50000000",

              Sequence:
                10,

              OwnerCount:
                0,

              Flags:
                0,
            },

            signer_lists:
              [],
          });
        }

        if (
          body.method ===
            "account_lines"
        ) {
          return rpcResponse({
            lines:
              [],
          });
        }

        if (
          body.method ===
            "account_objects"
        ) {
          return rpcResponse({
            account_objects:
              [],
          });
        }

        if (
          body.method ===
            "account_tx" &&
          params.forward ===
            true
        ) {
          return rpcResponse({
            transactions: [
              {
                hash:
                  "D".repeat(
                    64
                  ),

                ledger_index:
                  900,

                close_time_iso:
                  "2026-01-01T00:00:00Z",

                validated:
                  true,

                tx_json: {
                  TransactionType:
                    "Payment",

                  Account:
                    "rFundingSource11111111111111111111111",

                  Destination:
                    TARGET,

                  DeliverMax:
                    "9000000",

                  Fee:
                    "12",
                },

                meta: {
                  TransactionResult:
                    "tesSUCCESS",

                  delivered_amount:
                    "2500000",
                },
              },
            ],
          });
        }

        if (
          body.method ===
            "account_tx"
        ) {
          return rpcResponse({
            transactions: [
              {
                hash:
                  "A".repeat(
                    64
                  ),

                ledger_index:
                  1000,

                close_time_iso:
                  "2026-09-01T00:00:00Z",

                validated:
                  true,

                tx_json: {
                  TransactionType:
                    "Payment",

                  Account:
                    "rSource111111111111111111111111111",

                  Destination:
                    TARGET,

                  DeliverMax:
                    "9999999",

                  Fee:
                    "12",
                },

                meta: {
                  TransactionResult:
                    "tesSUCCESS",

                  delivered_amount:
                    "1500000",
                },
              },

              {
                hash:
                  "B".repeat(
                    64
                  ),

                ledger_index:
                  999,

                close_time_iso:
                  "2026-08-31T00:00:00Z",

                validated:
                  true,

                tx_json: {
                  TransactionType:
                    "Payment",

                  Account:
                    "rSource222222222222222222222222222",

                  Destination:
                    TARGET,

                  DeliverMax: {
                    currency:
                      "USD",

                    issuer:
                      "rIssuer111111111111111111111111111",

                    value:
                      "999",
                  },

                  Fee:
                    "12",
                },

                meta: {
                  TransactionResult:
                    "tesSUCCESS",

                  delivered_amount: {
                    currency:
                      "USD",

                    issuer:
                      "rIssuer111111111111111111111111111",

                    value:
                      "5",
                  },
                },
              },

              {
                hash:
                  "C".repeat(
                    64
                  ),

                ledger_index:
                  998,

                close_time_iso:
                  "2026-08-30T00:00:00Z",

                validated:
                  true,

                tx_json: {
                  TransactionType:
                    "Payment",

                  Account:
                    "rSource333333333333333333333333333",

                  Destination:
                    TARGET,

                  Flags:
                    131072,

                  DeliverMax:
                    "999999999",

                  Fee:
                    "12",
                },

                meta: {
                  TransactionResult:
                    "tesSUCCESS",

                  delivered_amount:
                    "unavailable",
                },
              },
            ],
          });
        }

        throw new Error(
          `Unexpected XRPL RPC method: ${body.method}`
        );
      };

    try {
      const result =
        await getXrplAccountEvidence({
          address:
            TARGET,

          analysisPlan:
            "advanced",
        });

      assert.equal(
        result.ok,
        true
      );

      if (
        !result.ok
      ) {
        throw new Error(
          "Expected XRPL provider success."
        );
      }

      assert.equal(
        result.data.transactions.length,
        3
      );

      const [
        nativePayment,
        issuedPayment,
        unavailablePartialPayment,
      ] =
        result.data.transactions;

      assert.equal(
        nativePayment.amountDrops,
        "1500000"
      );

      assert.equal(
        nativePayment.issuedAmount,
        null
      );

      assert.equal(
        issuedPayment.amountDrops,
        null
      );

      assert.equal(
        issuedPayment.issuedAmount?.currency,
        "USD"
      );

      assert.equal(
        issuedPayment.issuedAmount?.value,
        "5"
      );

      assert.equal(
        unavailablePartialPayment.amountDrops,
        null
      );

      assert.equal(
        unavailablePartialPayment.issuedAmount,
        null
      );

      assert.equal(
        result.data.firstObservedFunding
          ?.amountDrops,
        "2500000"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "falls back to DeliverMax only for successful non-partial payments",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async (
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
              readonly Record<
                string,
                unknown
              >[];
          };

        const params =
          body.params[0] ??
          {};

        if (
          body.method ===
          "account_info"
        ) {
          return rpcResponse({
            ledger_index:
              1000,

            account_data: {
              Balance:
                "50000000",

              Sequence:
                10,

              OwnerCount:
                0,

              Flags:
                0,
            },

            signer_lists:
              [],
          });
        }

        if (
          body.method ===
            "account_lines"
        ) {
          return rpcResponse({
            lines:
              [],
          });
        }

        if (
          body.method ===
            "account_objects"
        ) {
          return rpcResponse({
            account_objects:
              [],
          });
        }

        if (
          body.method ===
            "account_tx" &&
          params.forward ===
            true
        ) {
          return rpcResponse({
            transactions:
              [],
          });
        }

        if (
          body.method ===
            "account_tx"
        ) {
          return rpcResponse({
            transactions: [
              {
                hash:
                  "E".repeat(
                    64
                  ),

                ledger_index:
                  1000,

                validated:
                  true,

                tx_json: {
                  TransactionType:
                    "Payment",

                  Account:
                    "rSource444444444444444444444444444",

                  Destination:
                    TARGET,

                  DeliverMax:
                    "3000000",

                  Fee:
                    "12",
                },

                meta: {
                  TransactionResult:
                    "tesSUCCESS",
                },
              },
            ],
          });
        }

        throw new Error(
          `Unexpected XRPL RPC method: ${body.method}`
        );
      };

    try {
      const result =
        await getXrplAccountEvidence({
          address:
            TARGET,
        });

      assert.equal(
        result.ok,
        true
      );

      if (
        !result.ok
      ) {
        throw new Error(
          "Expected XRPL provider success."
        );
      }

      assert.equal(
        result.data.transactions[0]
          ?.amountDrops,
        "3000000"
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);