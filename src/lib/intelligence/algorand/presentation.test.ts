import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAlgorandActivityTimeline,
  buildAlgorandVisualEvidenceGraph,
} from "./presentation";

import type {
  AlgorandIntelligence,
} from "./engine";

const ROOT =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const OTHER =
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function fixture():
  AlgorandIntelligence {
  return {
    ok:
      true,

    network:
      "algorand",

    address:
      ROOT,

    analysisPlan:
      "free",

    coverage:
      "limited",

    account: {
      amountMicroAlgos:
        "1000000",

      minBalanceMicroAlgos:
        "100000",

      authAddress:
        null,
    },

    assets:
      [],

    createdAssets:
      [],

    appLocalStates:
      [],

    createdApplications:
      [],

    transactions:
      [],

    derived: {
      activity: {
        observedTransactionCount:
          1,

        observedInnerTransactionCount:
          0,

        applicationCallCount:
          0,

        rekeyTransactionCount:
          0,
      },

      flow: {
        incomingCount:
          1,

        outgoingCount:
          0,

        incomingMicroAlgos:
          "1000000",

        outgoingMicroAlgos:
          "0",

        transfers: [
          {
            transactionId:
              "ALGOTX",

            confirmedRound:
              123,

            roundTime:
              1_700_000_000,

            direction:
              "incoming",

            counterparty:
              OTHER,

            asset:
              "ALGO",

            amount:
              "1000000",

            kind:
              "payment",
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

            observationCount:
              1,

            incomingCount:
              1,

            outgoingCount:
              0,

            transactionIds: [
              "ALGOTX",
            ],
          },
        ],
      },

      assets: {
        holdingCount:
          0,

        createdAssetCount:
          0,

        controlledAssetCount:
          0,
      },

      applications: {
        localStateCount:
          0,

        createdApplicationCount:
          0,

        observedCallCount:
          0,
      },

      authority: {
        currentAuthAddress:
          null,

        observedRekeys:
          [],

        assetControls:
          [],
      },

      observedFunding: {
        sourceAddress:
          OTHER,

        transactionId:
          "ALGOTX",

        amountMicroAlgos:
          "1000000",

        confirmedRound:
          123,

        roundTime:
          1_700_000_000,
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

      transactionLimit:
        20,

      assetLimit:
        20,

      createdAssetLimit:
        20,

      applicationLimit:
        20,

      providerRequestBudget:
        14,

      providerRequestsUsed:
        6,

      historyHasMore:
        false,

      assetsHaveMore:
        false,

      createdAssetsHaveMore:
        false,

      appLocalStateHasMore:
        false,

      createdAppsHaveMore:
        false,

      transportFailoverUsed:
        false,

      unavailableEvidence:
        [],

      coverage:
        "complete",
    },

    modules: {
      accountState: {
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
      assets: {
        status:
          "complete",
        error:
          null,
      },
      assetAuthority: {
        status:
          "complete",
        error:
          null,
      },
      applications: {
        status:
          "complete",
        error:
          null,
      },
      rekey: {
        status:
          "complete",
        error:
          null,
      },
      innerTransactions: {
        status:
          "complete",
        error:
          null,
      },
      flow: {
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
  "Algorand presentation uses explicit transfer evidence only",
  () => {
    const data =
      fixture();

    const timeline =
      buildAlgorandActivityTimeline(
        data
      );

    const graph =
      buildAlgorandVisualEvidenceGraph(
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
      "ALGO"
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
  }
);
