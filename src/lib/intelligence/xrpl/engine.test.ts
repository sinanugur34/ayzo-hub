import assert from "node:assert/strict";
import test from "node:test";

import {
  runXrplIntelligence,
} from "./engine";

test(
  "builds XRPL intelligence from provider evidence",
  async () => {
    const result =
      await runXrplIntelligence(
        {
          address:
            "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        },
        {
          async loadEvidence() {
            return {
              ok:
                true,

              providerId:
                "xrpl-public",

              latencyMs:
                4,

              data: {
                account: {
                  exists:
                    true,

                  balanceDrops:
                    "1000000",

                  sequence:
                    1,

                  ownerCount:
                    0,

                  flags:
                    0,

                  ledgerIndex:
                    100,
                },

                transactions: [
                  {
                    transactionHash:
                      "A".repeat(64),

                    ledgerIndex:
                      100,

                    timestamp:
                      "2026-01-01T00:00:00Z",

                    validated:
                      true,

                    transactionType:
                      "Payment",

                    source:
                      "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",

                    destination:
                      "rrrrrrrrrrrrrrrrrrrrrhoLvTp",

                    amountDrops:
                      "1",

                    feeDrops:
                      "12",

                    result:
                      "tesSUCCESS",
                  },
                ],

                nextCursor:
                  null,
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

    if (
      !result.data.ok
    ) {
      throw new Error(
        "Expected XRPL success."
      );
    }

    assert.equal(
      result.data.network,
      "xrp"
    );

    assert.equal(
      result.data.history
        .transactions.length,
      1
    );

    assert.equal(
      result.data.modules
        .accountState.status,
      "complete"
    );
  }
);