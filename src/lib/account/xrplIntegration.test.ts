import assert from "node:assert/strict";
import test from "node:test";

import {
  getAskAyzoNetworkProfile,
} from "./askAyzoNetworkRegistry";

import {
  buildHistoricalSnapshot,
} from "./historicalSnapshot";

test(
  "exposes an explicit Ask AYZO profile for XRP Ledger",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "xrp"
      );

    assert.equal(
      profile.adapter,
      "xrpl"
    );

    assert.ok(
      profile.capabilities.includes(
        "transaction-history"
      )
    );
  }
);

test(
  "builds wallet history snapshot for XRP Ledger evidence",
  () => {
    const snapshot =
      buildHistoricalSnapshot(
        "xrp",
        {
          coverage:
            "partial",

          history: {
            transactions: [
              {
                transactionHash:
                  "A".repeat(64),

                timestamp:
                  "2026-01-01T00:00:00Z",

                ledgerIndex:
                  100,
              },
            ],
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
      "xrp"
    );

    assert.equal(
      snapshot?.subjectKind,
      "wallet"
    );

    assert.equal(
      snapshot?.metrics
        .transactionCount,
      1
    );
  }
);