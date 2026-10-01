import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHederaDerivedAnalysis,
} from "./analysis";

test(
  "derives Hedera HBAR flow counterparties funding token controls and staking",
  () => {
    const derived =
      buildHederaDerivedAnalysis({
        accountId:
          "0.0.1000",

        evidence: {
          account: {
            accountId:
              "0.0.1000",
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
                    "-500",
                  approval:
                    false,
                },
                {
                  accountId:
                    "0.0.1000",
                  amountTinybar:
                    "500",
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

          tokenRelationships: [
            {
              tokenId:
                "0.0.3000",
              balance:
                "5",
              automaticAssociation:
                false,
              createdTimestamp:
                null,
              freezeStatus:
                null,
              kycStatus:
                null,
            },
          ],

          nfts:
            [],

          coverage: {
            plan:
              "free",
            transactionLimit:
              16,
            tokenRelationshipLimit:
              16,
            nftLimit:
              12,
            providerRequestBudget:
              8,
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

        specialist: {
          tokenMetadata: [
            {
              tokenId:
                "0.0.3000",
              name:
                "Token",
              symbol:
                "TKN",
              type:
                "FUNGIBLE_COMMON",
              decimals:
                8,
              totalSupply:
                "1000",
              treasuryAccountId:
                "0.0.4000",
              pauseStatus:
                "UNPAUSED",
              controls: {
                admin: {
                  key:
                    "x",
                },
                supply:
                  null,
                wipe:
                  null,
                freeze:
                  null,
                kyc:
                  null,
                pause:
                  null,
                feeSchedule:
                  null,
              },
            },
          ],

          stakingRewards: [
            {
              accountId:
                "0.0.1000",
              amountTinybar:
                "25",
              timestamp:
                "1.000000001",
            },
          ],

          coverage: {
            tokenMetadataRequested:
              1,
            tokenMetadataReturned:
              1,
            stakingRewardsAvailable:
              true,
            providerRequestsUsed:
              2,
            unavailableEvidence:
              [],
          },
        },
      });

    assert.equal(
      derived.flow
        .incomingTinybar,
      "500"
    );

    assert.equal(
      derived.counterparties
        .items[0]
        ?.accountId,
      "0.0.2000"
    );

    assert.equal(
      derived.observedFunding
        ?.sourceAccountId,
      "0.0.2000"
    );

    assert.equal(
      derived.assets
        .tokensWithControlKeys,
      1
    );

    assert.equal(
      derived.staking
        .observedRewardCount,
      1
    );
  }
);
