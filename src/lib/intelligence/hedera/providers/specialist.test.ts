import assert from "node:assert/strict";
import test from "node:test";

import {
  getHederaSpecialistEvidence,
  type HederaSpecialistFetch,
} from "./specialist";

function response(
  body:
    unknown,
  status =
    200
) {
  return {
    ok:
      status >= 200 &&
      status < 300,

    status,

    async json() {
      return body;
    },
  };
}

test(
  "normalizes Hedera token control keys and staking rewards",
  async () => {
    const fetchImpl:
      HederaSpecialistFetch =
      async input => {
        const url =
          new URL(input);

        if (
          url.pathname ===
          "/api/v1/tokens/0.0.3000"
        ) {
          return response({
            token_id:
              "0.0.3000",

            name:
              "Example",

            symbol:
              "EX",

            type:
              "FUNGIBLE_COMMON",

            decimals:
              8,

            total_supply:
              "1000000",

            treasury_account_id:
              "0.0.5000",

            admin_key: {
              _type:
                "ED25519",
              key:
                "abc",
            },

            supply_key:
              null,

            wipe_key:
              null,

            freeze_key:
              null,

            kyc_key:
              null,

            pause_key: {
              _type:
                "ED25519",
              key:
                "def",
            },

            fee_schedule_key:
              null,

            pause_status:
              "UNPAUSED",
          });
        }

        if (
          url.pathname ===
          "/api/v1/accounts/0.0.1000/rewards"
        ) {
          return response({
            rewards: [
              {
                account_id:
                  "0.0.1000",

                amount:
                  100,

                timestamp:
                  "1700000000.000000001",
              },
            ],

            links: {
              next:
                null,
            },
          });
        }

        return response(
          {},
          404
        );
      };

    const result =
      await getHederaSpecialistEvidence(
        {
          accountId:
            "0.0.1000",

          tokenIds: [
            "0.0.3000",
          ],

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/api/v1",

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
        "Expected specialist evidence."
      );
    }

    assert.equal(
      result.data
        .tokenMetadata[0]
        ?.controls.admin !==
        null,
      true
    );

    assert.equal(
      result.data
        .tokenMetadata[0]
        ?.controls.pause !==
        null,
      true
    );

    assert.equal(
      result.data
        .stakingRewards[0]
        ?.amountTinybar,
      "100"
    );
  }
);
