import assert from "node:assert/strict";
import test from "node:test";

import {
  getAptosEvidence,
  type AptosFetch,
} from "./provider";

const ADDRESS =
  `0x${"11".repeat(32)}`;

function response(
  body: unknown,
  status = 200,
  headers:
    Record<string, string> =
      {}
) {
  return {
    ok:
      status >= 200 &&
      status < 300,
    status,
    headers: {
      get(name: string) {
        return (
          headers[
            name.toLowerCase()
          ] ??
          headers[name] ??
          null
        );
      },
    },
    async json() {
      return body;
    },
  };
}

test(
  "normalizes Aptos fullnode state resources and transactions",
  async () => {
    const fetchImpl:
      AptosFetch =
      async input => {
        const url =
          new URL(input);

        if (
          url.pathname ===
          "/v1"
        ) {
          return response(
            {
              chain_id:
                1,
              ledger_version:
                "1000",
            },
            200,
            {
              "x-aptos-ledger-oldest-version":
                "100",
            }
          );
        }

        if (
          url.pathname ===
          `/v1/accounts/${ADDRESS}`
        ) {
          return response({
            sequence_number:
              "7",
            authentication_key:
              ADDRESS,
          });
        }

        if (
          url.pathname.endsWith(
            "/resources"
          )
        ) {
          return response([
            {
              type:
                "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
              data: {
                coin: {
                  value:
                    "100000000",
                },
              },
            },
          ]);
        }

        if (
          url.pathname.endsWith(
            "/transactions"
          )
        ) {
          return response([
            {
              type:
                "user_transaction",
              hash:
                `0x${"aa".repeat(32)}`,
              version:
                "999",
              timestamp:
                "1700000000000000",
              sender:
                ADDRESS,
              success:
                true,
              vm_status:
                "Executed successfully",
              gas_used:
                "10",
              gas_unit_price:
                "100",
              sequence_number:
                "7",
              payload: {
                function:
                  "0x1::aptos_account::transfer",
              },
              events:
                [],
              changes:
                [],
            },
          ]);
        }

        return response(
          {},
          404
        );
      };

    const result =
      await getAptosEvidence(
        {
          address:
            ADDRESS,
          analysisPlan:
            "free",
        },
        {
          fetchImpl,
          baseUrl:
            "https://example.invalid/v1",
          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Expected Aptos evidence."
      );
    }

    assert.equal(
      result.data
        .aptBalanceOctas,
      "100000000"
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );

    assert.equal(
      result.data
        .resources
        .length,
      1
    );
  }
);
