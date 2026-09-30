import assert from "node:assert/strict";
import test from "node:test";

import {
  getAptosIndexedEvidence,
  type AptosIndexerFetch,
} from "./indexer";

const ROOT =
  `0x${"11".repeat(32)}`;

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
  "normalizes Aptos indexed FA and object evidence",
  async () => {
    const fetchImpl:
      AptosIndexerFetch =
      async () =>
        response({
          data: {
            current_fungible_asset_balances: [
              {
                amount:
                  "25000000",

                asset_type:
                  "0xa",

                storage_id:
                  `0x${"aa".repeat(32)}`,

                metadata: {
                  asset_type:
                    "0xa",

                  name:
                    "Test Asset",

                  symbol:
                    "TEST",

                  decimals:
                    8,
                },
              },
            ],

            current_objects: [
              {
                object_address:
                  `0x${"bb".repeat(32)}`,

                owner_address:
                  ROOT,

                state_key_hash:
                  `0x${"cc".repeat(32)}`,

                allow_ungated_transfer:
                  true,
              },
            ],
          },
        });

    const result =
      await getAptosIndexedEvidence(
        {
          address:
            ROOT,

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          graphqlUrl:
            "https://example.invalid/v1/graphql",

          apiKey:
            null,

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
        "Expected indexed Aptos evidence."
      );
    }

    assert.equal(
      result.data
        .fungibleAssets[0]
        ?.symbol,
      "TEST"
    );

    assert.equal(
      result.data
        .objects[0]
        ?.ownerAddress,
      ROOT
    );
  }
);

test(
  "fails closed when Aptos Indexer is not configured",
  async () => {
    const result =
      await getAptosIndexedEvidence(
        {
          address:
            ROOT,

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async () =>
              response(
                {}
              ),

          graphqlUrl:
            null,

          apiKey:
            null,

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "UPSTREAM_ERROR"
      );
    }
  }
);
