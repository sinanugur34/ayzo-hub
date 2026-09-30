import assert from "node:assert/strict";
import test from "node:test";

import {
  getStellarEvidence,
  type StellarFetch,
} from "./provider";

const ACCOUNT =
  "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ";

function response(
  body:
    unknown,
  status =
    200
) {
  return {
    ok:
      status >=
        200 &&
      status <
        300,

    status,

    async json() {
      return body;
    },
  };
}

test(
  "normalizes Stellar Horizon account evidence",
  async () => {
    const fetchImpl:
      StellarFetch =
      async input => {
        const url =
          new URL(
            input
          );

        if (
          url.pathname ===
          `/accounts/${ACCOUNT}`
        ) {
          return response({
            account_id:
              ACCOUNT,

            sequence:
              "123",

            subentry_count:
              2,

            thresholds: {
              low_threshold:
                1,

              med_threshold:
                2,

              high_threshold:
                3,
            },

            flags: {
              auth_required:
                false,

              auth_revocable:
                false,

              auth_immutable:
                false,

              auth_clawback_enabled:
                false,
            },

            balances: [
              {
                asset_type:
                  "native",

                balance:
                  "12.5000000",
              },

              {
                asset_type:
                  "credit_alphanum4",

                asset_code:
                  "USDC",

                asset_issuer:
                  ACCOUNT,

                balance:
                  "5.0000000",

                limit:
                  "1000.0000000",

                is_authorized:
                  true,
              },
            ],

            signers: [
              {
                key:
                  ACCOUNT,

                type:
                  "ed25519_public_key",

                weight:
                  1,
              },
            ],
          });
        }

        if (
          url.pathname.endsWith(
            "/transactions"
          )
        ) {
          return response({
            _embedded: {
              records: [
                {
                  hash:
                    "tx",

                  ledger:
                    10,

                  created_at:
                    "2026-09-30T00:00:00Z",

                  source_account:
                    ACCOUNT,

                  fee_charged:
                    "100",

                  operation_count:
                    1,

                  successful:
                    true,
                },
              ],
            },
          });
        }

        if (
          url.pathname.endsWith(
            "/payments"
          )
        ) {
          return response({
            _embedded: {
              records: [],
            },
          });
        }

        return response({
          _embedded: {
            records: [],
          },
        });
      };

    const result =
      await getStellarEvidence(
        {
          address:
            ACCOUNT,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid",

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
        "Expected Stellar evidence."
      );
    }

    assert.equal(
      result.data
        .account
        .balances
        .length,
      2
    );

    assert.equal(
      result.data
        .transactions
        .length,
      1
    );
  }
);

test(
  "rejects invalid Stellar account before provider access",
  async () => {
    let called =
      false;

    const result =
      await getStellarEvidence(
        {
          address:
            "invalid",

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async () => {
              called =
                true;

              return response(
                {}
              );
            },

          baseUrl:
            "https://example.invalid",

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      called,
      false
    );
  }
);
