import assert from "node:assert/strict";
import test from "node:test";

import {
  runXrplIntelligence,
} from "./engine";

test(
  "builds expanded XRPL intelligence from provider evidence",
  async () => {
    const result =
      await runXrplIntelligence(
        {
          address:
            "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",

          analysisPlan:
            "advanced",
        },
        {
          async loadEvidence(
            input
          ) {
            assert.equal(
              input.analysisPlan,
              "advanced"
            );

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
                    2,

                  flags:
                    0,

                  ledgerIndex:
                    100,

                  domain:
                    null,

                  regularKey:
                    null,

                  transferRate:
                    null,

                  tickSize:
                    null,
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
                      "rSource111111111111111111111111111",

                    destination:
                      "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",

                    destinationTag:
                      null,

                    sourceTag:
                      null,

                    amountDrops:
                      "1000000",

                    issuedAmount:
                      null,

                    feeDrops:
                      "12",

                    result:
                      "tesSUCCESS",
                  },
                ],

                nextCursor:
                  null,

                trustLines: [
                  {
                    counterparty:
                      "rIssuer111111111111111111111111111",

                    currency:
                      "USD",

                    balance:
                      "5",

                    limit:
                      "100",

                    peerLimit:
                      "0",

                    noRipple:
                      false,

                    noRipplePeer:
                      false,

                    authorized:
                      true,

                    peerAuthorized:
                      false,

                    freeze:
                      false,

                    freezePeer:
                      false,
                  },
                ],

                accountObjects: [
                  {
                    ledgerEntryType:
                      "RippleState",

                    index:
                      "B".repeat(64),

                    flags:
                      0,
                  },
                ],

                signerLists: [
                  {
                    quorum:
                      2,

                    signers: [
                      {
                        account:
                          "rSigner111111111111111111111111111",

                        weight:
                          1,
                      },

                      {
                        account:
                          "rSigner222222222222222222222222222",

                        weight:
                          1,
                      },
                    ],
                  },
                ],

                firstObservedFunding: {
                  source:
                    "rSource111111111111111111111111111",

                  destination:
                    "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",

                  transactionHash:
                    "A".repeat(64),

                  ledgerIndex:
                    100,

                  timestamp:
                    "2026-01-01T00:00:00Z",

                  amountDrops:
                    "1000000",

                  result:
                    "tesSUCCESS",
                },

                availability: {
                  trustLines:
                    true,

                  accountObjects:
                    true,

                  earliestHistory:
                    true,
                },

                coverage: {
                  plan:
                    "advanced",

                  historyLimit:
                    30,

                  earliestHistoryLimit:
                    30,

                  trustLineLimit:
                    50,

                  accountObjectLimit:
                    50,

                  historyHasMore:
                    false,

                  trustLinesHaveMore:
                    false,

                  accountObjectsHaveMore:
                    false,
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

    if (
      !result.data.ok
    ) {
      throw new Error(
        "Expected XRPL success."
      );
    }

    assert.equal(
      result.data.analysisPlan,
      "advanced"
    );

    assert.equal(
      result.data.history.transactions.length,
      1
    );

    assert.equal(
      result.data.derived.flow.incomingCount,
      1
    );

    assert.equal(
      result.data.derived.trustLines.trustLineCount,
      1
    );

    assert.equal(
      result.data.derived.signer.multisignConfigured,
      true
    );

    assert.equal(
      result.data.firstObservedFunding?.source,
      "rSource111111111111111111111111111"
    );
  }
);