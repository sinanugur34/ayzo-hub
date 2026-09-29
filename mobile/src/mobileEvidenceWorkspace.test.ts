import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildMobileEvidenceWorkspace,
} from "./mobileEvidenceWorkspace";

test(
  "EVM mobile workspace uses explicit graph and activity evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "ethereum",

        address:
          "0x1111111111111111111111111111111111111111",

        data: {
          modules: {
            walletGraph: {
              status:
                "complete",

              data: {
                nodes: [
                  {
                    address:
                      "0x1111111111111111111111111111111111111111",
                    depth:
                      0,
                    interactionCount:
                      3,
                  },
                  {
                    address:
                      "0x2222222222222222222222222222222222222222",
                    depth:
                      1,
                    interactionCount:
                      3,
                  },
                ],

                edges: [
                  {
                    addressA:
                      "0x1111111111111111111111111111111111111111",
                    addressB:
                      "0x2222222222222222222222222222222222222222",
                    direction:
                      "a_to_b",
                    interactionCount:
                      3,
                  },
                ],
              },
            },

            fundingProvenance: {
              status:
                "complete",

              data: {
                sources: [],
              },
            },
          },

          activityTimeline: {
            events: [
              {
                direction:
                  "outgoing",
                from:
                  "0x1111111111111111111111111111111111111111",
                to:
                  "0x2222222222222222222222222222222222222222",
                transactionHash:
                  "0xabc",
                timestamp:
                  "2026-09-29T00:00:00Z",
                formattedValue:
                  "1",
                asset:
                  "ETH",
              },
            ],
          },
        },
      });

    assert.ok(
      workspace.edges.length >
      0
    );

    assert.equal(
      workspace.timeline[0]
        ?.direction,
      "outgoing"
    );

    assert.equal(
      workspace.timeline[0]
        ?.transactionRef,
      "0xabc"
    );
  }
);

test(
  "Solana workspace uses holder and funding evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "solana",

        address:
          "Token111111111111111111111111111111111111",

        data: {
          holders: {
            owners: [
              {
                rank:
                  1,
                owner:
                  "Wallet11111111111111111111111111111111111",
                percentage:
                  25,
              },
            ],
          },

          relationships: {
            relations: [],
          },

          funding: {
            perWallet: [
              {
                wallet:
                  "Wallet11111111111111111111111111111111111",

                recentIncomingTransfers: [
                  {
                    source:
                      "Funder11111111111111111111111111111111111",
                    sol:
                      2,
                    signature:
                      "sig-1",
                  },
                ],
              },
            ],
          },
        },
      });

    assert.ok(
      workspace.edges.some(
        edge =>
          edge.label ===
          "Observed SOL funding"
      )
    );

    assert.equal(
      workspace.timeline[0]
        ?.direction,
      "incoming"
    );
  }
);

test(
  "Bitcoin workspace preserves bounded transaction evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "bitcoin",

        address:
          "bc1qexample",

        data: {
          history: {
            transactions: [
              {
                transactionHash:
                  "btc-hash",
                blockHeight:
                  900000,
                timestamp:
                  "2026-09-29T00:00:00Z",
              },
            ],
          },
        },
      });

    assert.equal(
      workspace.timeline.length,
      1
    );

    assert.ok(
      workspace.nodes.some(
        node =>
          node.kind ===
          "transaction"
      )
    );
  }
);

test(
  "Dogecoin workspace uses explicit counterparty evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "dogecoin",

        address:
          "DTarget",

        data: {
          derived: {
            counterparties: {
              items: [
                {
                  address:
                    "DPeer",
                  incomingCount:
                    1,
                  outgoingCount:
                    0,
                  observationCount:
                    1,
                },
              ],
            },
          },
        },
      });

    assert.ok(
      workspace.edges.some(
        edge =>
          edge.label ===
          "Observed Dogecoin relationship"
      )
    );
  }
);

test(
  "TRON workspace uses explicit counterparty evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "tron",

        address:
          "TTarget",

        data: {
          derived: {
            counterparties: {
              items: [
                {
                  addressHex:
                    "41abc",
                  incomingCount:
                    0,
                  outgoingCount:
                    2,
                  observationCount:
                    2,
                },
              ],
            },
          },
        },
      });

    assert.ok(
      workspace.edges.some(
        edge =>
          edge.label ===
          "Explicit TRON relationship"
      )
    );
  }
);

test(
  "XRPL workspace uses transaction and trust-line relationship evidence",
  () => {
    const workspace =
      buildMobileEvidenceWorkspace({
        networkId:
          "xrp",

        address:
          "rTarget",

        data: {
          derived: {
            counterparties: {
              counterparties: [
                {
                  address:
                    "rPeer",
                  incomingCount:
                    1,
                  outgoingCount:
                    1,
                  trustLineCount:
                    1,
                  interactionCount:
                    3,
                },
              ],
            },
          },
        },
      });

    assert.ok(
      workspace.edges.some(
        edge =>
          edge.label ===
          "Transaction / trust-line relationship"
      )
    );
  }
);

test(
  "mobile result surface exposes the web investigation hierarchy",
  () => {
    const panel =
      fs.readFileSync(
        "mobile/src/MobileAnalysisResultPanel.tsx",
        "utf8"
      );

    for (
      const text of [
        "Follow the evidence.",
        "Evidence map",
        "AYZO EVIDENCE BRIEF",
        "Evidence timeline",
        "DETAILED EVIDENCE",
        "RESEARCH TOOLS",
      ]
    ) {
      assert.ok(
        panel.includes(
          text
        ),
        `Missing mobile workspace text: ${text}`
      );
    }
  }
);

test(
  "mobile visual workspace explicitly blocks ownership inference",
  () => {
    const panel =
      fs.readFileSync(
        "mobile/src/MobileAnalysisResultPanel.tsx",
        "utf8"
      );

    const model =
      fs.readFileSync(
        "mobile/src/mobileEvidenceWorkspace.ts",
        "utf8"
      );

    assert.match(
      panel,
      /Connections do not establish identity,\s*common ownership, intent or control/
    );

    assert.match(
      model,
      /does not establish identity, common ownership, intent or control/
    );

    assert.doesNotMatch(
      model,
      /same owner|same entity|owned by/i
    );
  }
);
