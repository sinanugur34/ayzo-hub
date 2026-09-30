import assert from "node:assert/strict";
import test from "node:test";

import {
  runHederaIntelligence,
} from "./engine";

test(
  "runs Hedera deep intelligence",
  async () => {
    const result =
      await runHederaIntelligence(
        {
          address:
            "0.0.1000",

          analysisPlan:
            "pro",
        },
        {
          async loadEvidence(
            input
          ) {
            return {
              ok:
                true,

              providerId:
                "hedera-mirror-public",

              latencyMs:
                1,

              data: {
                account: {
                  accountId:
                    input.accountId,
                  alias:
                    null,
                  evmAddress:
                    null,
                  balanceTinybar:
                    "1000",
                  balanceTimestamp:
                    null,
                  deleted:
                    false,
                  ethereumNonce:
                    null,
                  memo:
                    null,
                  receiverSignatureRequired:
                    false,
                  stakedAccountId:
                    null,
                  stakedNodeId:
                    "3",
                  stakePeriodStart:
                    null,
                  pendingRewardTinybar:
                    "25",
                  declineReward:
                    false,
                },

                transactions: [
                  {
                    transactionId:
                      "fund",
                    consensusTimestamp:
                      "1.000000001",
                    name:
                      "CRYPTOTRANSFER",
                    result:
                      "SUCCESS",
                    chargedTxFeeTinybar:
                      "1",
                    transfers: [
                      {
                        accountId:
                          "0.0.2000",
                        amountTinybar:
                          "-100",
                        approval:
                          false,
                      },
                      {
                        accountId:
                          "0.0.1000",
                        amountTinybar:
                          "100",
                        approval:
                          false,
                      },
                    ],
                    tokenTransfers:
                      [],
                    nftTransfers:
                      [],
                  },
                ],

                tokenRelationships:
                  [],

                nfts:
                  [],

                coverage: {
                  plan:
                    input.analysisPlan,
                  transactionLimit:
                    48,
                  tokenRelationshipLimit:
                    48,
                  nftLimit:
                    32,
                  providerRequestBudget:
                    18,
                  providerRequestsUsed:
                    4,
                  historyHasMore:
                    false,
                  tokensHaveMore:
                    false,
                  nftsHaveMore:
                    false,
                  tokenControlMetadataAvailable:
                    false,
                  coverage:
                    "partial",
                  unavailableEvidence:
                    [],
                },
              },
            };
          },

          async loadSpecialist() {
            return {
              ok:
                true,

              providerId:
                "hedera-mirror-public",

              latencyMs:
                1,

              data: {
                tokenMetadata:
                  [],

                stakingRewards:
                  [],

                coverage: {
                  tokenMetadataRequested:
                    0,
                  tokenMetadataReturned:
                    0,
                  stakingRewardsAvailable:
                    true,
                  providerRequestsUsed:
                    1,
                  unavailableEvidence:
                    [],
                },
              },
            };
          },
        }
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.data.ok,
      true
    );

    if (!result.data.ok) {
      assert.fail(
        "Expected Hedera intelligence."
      );
    }

    assert.equal(
      result.data.network,
      "hedera"
    );

    assert.equal(
      result.data.derived
        .observedFunding
        ?.sourceAccountId,
      "0.0.2000"
    );
  }
);

test(
  "rejects invalid Hedera account before provider work",
  async () => {
    let called =
      false;

    const result =
      await runHederaIntelligence(
        {
          address:
            "0x1111111111111111111111111111111111111111",
        },
        {
          async loadEvidence() {
            called =
              true;

            throw new Error(
              "must not run"
            );
          },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);
