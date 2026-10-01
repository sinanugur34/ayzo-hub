import assert from "node:assert/strict";
import test from "node:test";

import {
  buildZcashActivityTimeline,
  buildZcashVisualEvidenceGraph,
} from "./presentation";

import type {
  ZcashIntelligence,
} from "./engine";

const ROOT =
  "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH";

const OTHER =
  "t1VUL4xZ7op6qRCAQ7a9u1uv3M9A7x4XwXH";

function fixture():
  ZcashIntelligence {
  return {
    ok:
      true,

    network:
      "zcash",

    address:
      ROOT,

    addressKind:
      "transparent-p2pkh",

    analysisPlan:
      "free",

    coverage:
      "limited",

    balanceZatoshis:
      "100000000",

    totalReceivedZatoshis:
      "100000000",

    totalSpentZatoshis:
      "0",

    transactions:
      [],

    utxos:
      [],

    canonicalTransactions:
      [],

    derived: {
      flow: {
        incomingTransactionCount:
          1,

        outgoingTransactionCount:
          0,

        incomingZatoshis:
          "100000000",

        explicitOutgoingZatoshis:
          "0",

        transfers: [
          {
            txid:
              "a".repeat(64),

            height:
              100,

            timestamp:
              "2026-01-01T00:00:00.000Z",

            direction:
              "incoming",

            counterparty:
              OTHER,

            amountZatoshis:
              "100000000",

            evidence:
              "explicit-transparent-input",
          },
        ],
      },

      counterparties: {
        count:
          1,

        items: [
          {
            address:
              OTHER,

            incomingCount:
              1,

            outgoingCount:
              0,

            observationCount:
              1,

            transactionIds: [
              "a".repeat(64),
            ],
          },
        ],
      },

      observedFunding: {
        sourceAddress:
          OTHER,

        txid:
          "a".repeat(64),

        amountZatoshis:
          "100000000",

        height:
          100,

        timestamp:
          "2026-01-01T00:00:00.000Z",
      },

      privacyBoundary: {
        transactionsWithUnresolvedInputs:
          0,

        transactionsWithUnresolvedOutputs:
          0,

        unresolvedInputCount:
          0,

        unresolvedOutputCount:
          0,
      },

      timeline: {
        events:
          [],
      },

      graph: {
        nodes:
          [],

        edges:
          [],
      },
    },

    evidenceCoverage: {
      plan:
        "free",

      historyLimit:
        12,

      utxoLimit:
        12,

      canonicalSampleLimit:
        4,

      providerRequestBudget:
        8,

      providerRequestsUsed:
        2,

      historyHasMore:
        false,

      utxosHaveMore:
        false,

      canonicalRequested:
        0,

      canonicalVerified:
        0,

      canonicalUnavailable:
        0,
    },

    modules: {
      addressState: {
        status:
          "complete",
        error:
          null,
      },
      transactionHistory: {
        status:
          "complete",
        error:
          null,
      },
      utxos: {
        status:
          "complete",
        error:
          null,
      },
      canonicalEvidence: {
        status:
          "limited",
        error:
          null,
      },
      transparentFlow: {
        status:
          "limited",
        error:
          null,
      },
      counterparties: {
        status:
          "limited",
        error:
          null,
      },
      funding: {
        status:
          "limited",
        error:
          null,
      },
      privacyBoundary: {
        status:
          "limited",
        error:
          null,
      },
      timeline: {
        status:
          "limited",
        error:
          null,
      },
      graph: {
        status:
          "limited",
        error:
          null,
      },
    },

    findings:
      [],

    caveats:
      [],
  };
}

test(
  "Zcash presentation preserves transparent-only evidence",
  () => {
    const data =
      fixture();

    const timeline =
      buildZcashActivityTimeline(
        data
      );

    const graph =
      buildZcashVisualEvidenceGraph(
        data
      );

    assert.equal(
      timeline.events.length,
      1
    );

    assert.equal(
      timeline.events[0]
        ?.direction,
      "incoming"
    );

    assert.equal(
      timeline.events[0]
        ?.asset,
      "ZEC"
    );

    assert.equal(
      graph.edges.length,
      1
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

    assert.match(
      graph.limitation ??
        "",
      /does not infer shielded/i
    );
  }
);
