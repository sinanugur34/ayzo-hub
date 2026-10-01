import assert from "node:assert/strict";
import test from "node:test";

import {
  getHederaMirrorEvidence,
  type HederaFetch,
} from "./provider";

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
  "normalizes Hedera account transaction token and NFT evidence",
  async () => {
    const fetchImpl:
      HederaFetch =
      async input => {
        const url =
          new URL(
            input
          );

        if (
          url.pathname ===
          "/api/v1/accounts/0.0.1000"
        ) {
          return response({
            account:
              "0.0.1000",

            alias:
              null,

            evm_address:
              "0x1111111111111111111111111111111111111111",

            balance: {
              balance:
                1_000_000,

              timestamp:
                "1700000000.000000001",
            },

            deleted:
              false,

            ethereum_nonce:
              7,

            memo:
              "AYZO test",

            receiver_sig_required:
              false,

            staked_account_id:
              null,

            staked_node_id:
              3,

            stake_period_start:
              "1700000000.000000000",

            pending_reward:
              1234,

            decline_reward:
              false,
          });
        }

        if (
          url.pathname ===
          "/api/v1/transactions"
        ) {
          assert.equal(
            url.searchParams.get(
              "account.id"
            ),
            "0.0.1000"
          );

          assert.equal(
            url.searchParams.get(
              "order"
            ),
            "desc"
          );

          return response({
            transactions: [
              {
                transaction_id:
                  "0.0.1000-1700000000-000000001",

                consensus_timestamp:
                  "1700000001.000000001",

                name:
                  "CRYPTOTRANSFER",

                result:
                  "SUCCESS",

                charged_tx_fee:
                  1000,

                transfers: [
                  {
                    account:
                      "0.0.1000",

                    amount:
                      -250,

                    is_approval:
                      false,
                  },
                  {
                    account:
                      "0.0.2000",

                    amount:
                      250,

                    is_approval:
                      false,
                  },
                ],

                token_transfers: [
                  {
                    token_id:
                      "0.0.3000",

                    account:
                      "0.0.1000",

                    amount:
                      -5,

                    is_approval:
                      false,
                  },
                ],

                nft_transfers: [
                  {
                    token_id:
                      "0.0.4000",

                    serial_number:
                      7,

                    sender_account_id:
                      "0.0.1000",

                    receiver_account_id:
                      "0.0.2000",

                    is_approval:
                      false,
                  },
                ],
              },
            ],

            links: {
              next:
                null,
            },
          });
        }

        if (
          url.pathname ===
          "/api/v1/accounts/0.0.1000/tokens"
        ) {
          return response({
            tokens: [
              {
                token_id:
                  "0.0.3000",

                balance:
                  42,

                automatic_association:
                  true,

                created_timestamp:
                  "1690000000.000000001",

                freeze_status:
                  "UNFROZEN",

                kyc_status:
                  "GRANTED",
              },
            ],

            links: {
              next:
                null,
            },
          });
        }

        if (
          url.pathname ===
          "/api/v1/accounts/0.0.1000/nfts"
        ) {
          return response({
            nfts: [
              {
                token_id:
                  "0.0.4000",

                serial_number:
                  7,

                account_id:
                  "0.0.1000",

                spender:
                  null,

                delegating_spender:
                  null,

                created_timestamp:
                  "1680000000.000000001",

                modified_timestamp:
                  "1700000001.000000001",

                deleted:
                  false,

                metadata:
                  "bWV0YWRhdGE=",
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
      await getHederaMirrorEvidence(
        {
          accountId:
            "0.0.1000",

          analysisPlan:
            "free",
        },
        {
          fetchImpl,

          baseUrl:
            "https://example.invalid/api/v1",

          timeoutMs:
            1000,

          providerId:
            "hedera-hgraph",
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        "Expected Hedera evidence."
      );
    }

    assert.equal(
      result.providerId,
      "hedera-hgraph"
    );

    assert.equal(
      result.data
        .account.accountId,
      "0.0.1000"
    );

    assert.equal(
      result.data
        .account.balanceTinybar,
      "1000000"
    );

    assert.equal(
      result.data
        .transactions.length,
      1
    );

    assert.equal(
      result.data
        .transactions[0]
        ?.transfers.length,
      2
    );

    assert.equal(
      result.data
        .transactions[0]
        ?.nftTransfers[0]
        ?.serialNumber,
      7
    );

    assert.equal(
      result.data
        .tokenRelationships[0]
        ?.tokenId,
      "0.0.3000"
    );

    assert.equal(
      result.data
        .nfts[0]
        ?.tokenId,
      "0.0.4000"
    );

    assert.equal(
      result.data
        .coverage
        .tokenControlMetadataAvailable,
      false
    );
  }
);

test(
  "rejects invalid Hedera account before Mirror Node access",
  async () => {
    let called =
      false;

    const result =
      await getHederaMirrorEvidence(
        {
          accountId:
            "0x1111111111111111111111111111111111111111",

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
            "https://example.invalid/api/v1",

          timeoutMs:
            1000,
        }
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      assert.fail(
        "Expected Hedera validation failure."
      );
    }

    assert.equal(
      result.code,
      "INVALID_ACCOUNT"
    );

    assert.equal(
      called,
      false
    );
  }
);
