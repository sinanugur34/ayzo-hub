import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHederaActivityTimeline,
  buildHederaVisualEvidenceGraph,
} from "./presentation";

test(
  "Hedera presentation excludes ownership inference",
  () => {
    const graph =
      buildHederaVisualEvidenceGraph(
        {
          address:
            "0.0.1000",

          analysisPlan:
            "free",

          derived: {
            counterparties: {
              items: [
                {
                  accountId:
                    "0.0.2000",
                  incomingCount:
                    1,
                  outgoingCount:
                    0,
                  observationCount:
                    1,
                  transactionIds: [
                    "tx",
                  ],
                },
              ],
            },

            observedFunding: {
              sourceAccountId:
                "0.0.2000",
            },
          },
        } as never
      );

    assert.equal(
      graph.edges[0]
        ?.kind,
      "funding"
    );

    assert.equal(
      graph.coverage
        .ownershipInference,
      false
    );
  }
);

test(
  "Hedera timeline renders explicit HBAR evidence",
  () => {
    const timeline =
      buildHederaActivityTimeline(
        {
          address:
            "0.0.1000",

          analysisPlan:
            "free",

          transactions: [
            {},
          ],

          derived: {
            flow: {
              transfers: [
                {
                  transactionId:
                    "tx",
                  consensusTimestamp:
                    "1700000000.000000001",
                  direction:
                    "incoming",
                  counterparty:
                    "0.0.2000",
                  amountTinybar:
                    "100000000",
                },
              ],
            },
          },
        } as never
      );

    assert.equal(
      timeline.events[0]
        ?.asset,
      "HBAR"
    );
  }
);
