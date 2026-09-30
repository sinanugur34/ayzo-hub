import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistoricalSnapshot,
} from "./historicalSnapshot";

test(
  "builds bounded NEAR Historical Evidence snapshot",
  () => {
    const snapshot =
      buildHistoricalSnapshot(
        "near",
        {
          coverage:
            "partial",

          account: {
            amountYoctoNear:
              "1000",
          },

          history: {
            transactions: [
              {
                transactionHash:
                  "hash",
                blockTimestamp:
                  "2026-09-30T00:00:00.000Z",
                blockHeight:
                  100,
              },
            ],
          },

          derived: {
            flow: {
              incomingTransferCount:
                2,
            },

            counterparties: {
              count:
                3,
            },

            observedFunding: {
              sourceAccountId:
                "funder.near",
            },
          },

          modules: {
            accountState: {
              status:
                "complete",
            },
          },

          findings:
            [],
        }
      );

    assert.ok(
      snapshot
    );

    assert.equal(
      snapshot?.network,
      "near"
    );

    assert.equal(
      snapshot
        ?.metrics
        .nativeBalanceRaw,
      "1000"
    );

    assert.equal(
      snapshot
        ?.metrics
        .transactionCount,
      1
    );

    assert.equal(
      snapshot
        ?.metrics
        .relationshipsDetected,
      3
    );

    assert.equal(
      snapshot
        ?.metrics
        .fundingSourceCount,
      1
    );
  }
);

test(
  "builds bounded Hedera Historical Evidence snapshot",
  () => {
    const snapshot =
      buildHistoricalSnapshot(
        "hedera",
        {
          coverage:
            "partial",

          account: {
            balanceTinybar:
              "500",
          },

          transactions: [
            {
              transactionId:
                "tx",
              consensusTimestamp:
                "1700000000.000000001",
            },
          ],

          tokenRelationships: [
            {
              tokenId:
                "0.0.3000",
            },
          ],

          nfts: [
            {
              tokenId:
                "0.0.4000",
              serialNumber:
                1,
            },
          ],

          derived: {
            flow: {
              incomingTransferCount:
                1,
            },

            counterparties: {
              count:
                2,
            },

            observedFunding: {
              sourceAccountId:
                "0.0.2000",
            },
          },

          modules: {
            accountState: {
              status:
                "complete",
            },
          },

          findings:
            [],
        }
      );

    assert.ok(
      snapshot
    );

    assert.equal(
      snapshot?.network,
      "hedera"
    );

    assert.equal(
      snapshot
        ?.metrics
        .nativeBalanceRaw,
      "500"
    );

    assert.equal(
      snapshot
        ?.metrics
        .assetBalanceTypeCount,
      1
    );

    assert.equal(
      snapshot
        ?.metrics
        .ownedObjectCount,
      1
    );

    assert.equal(
      snapshot
        ?.metrics
        .fundingSourceCount,
      1
    );
  }
);
