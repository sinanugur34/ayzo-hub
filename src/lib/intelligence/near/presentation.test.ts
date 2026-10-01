import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNearActivityTimeline,
  buildNearVisualEvidenceGraph,
} from "./presentation";

const DATA =
  {
    ok:
      true as const,

    network:
      "near" as const,

    address:
      "alice.near",

    analysisPlan:
      "free" as const,

    coverage:
      "partial" as const,

    account: {
      accountId:
        "alice.near",
      accountKind:
        "named" as const,
      amountYoctoNear:
        "1",
      lockedYoctoNear:
        "0",
      storageUsage:
        null,
      storagePaidAt:
        null,
      codeHash:
        null,
      blockHeight:
        null,
      blockHash:
        null,
    },

    accessKeys:
      [],

    history: {
      transactions:
        [],
      receipts:
        [],
    },

    derived: {
      activity: {
        transactionCount:
          1,
        receiptCount:
          0,
        actionCount:
          1,
        functionCallCount:
          0,
        transferActionCount:
          1,
      },

      flow: {
        incomingTransferCount:
          1,
        outgoingTransferCount:
          0,
        incomingYoctoNear:
          "100",
        outgoingYoctoNear:
          "0",
        transfers: [
          {
            transactionHash:
              "hash",
            receiptId:
              null,
            timestamp:
              "2026-01-01T00:00:00.000Z",
            direction:
              "incoming" as const,
            counterparty:
              "funder.near",
            amountYoctoNear:
              "100",
            source:
              "transaction" as const,
          },
        ],
      },

      counterparties: {
        count:
          1,
        items: [
          {
            accountId:
              "funder.near",
            incomingCount:
              1,
            outgoingCount:
              0,
            observationCount:
              1,
            evidenceRefs: [
              "hash",
            ],
          },
        ],
      },

      specialist: {
        accessKeyCount:
          0,
        functionCallMethods:
          [],
        receiptActionCount:
          0,
      },

      observedFunding: {
        sourceAccountId:
          "funder.near",
        transactionHash:
          "hash",
        amountYoctoNear:
          "100",
        timestamp:
          "2026-01-01T00:00:00.000Z",
      },
    },

    evidenceCoverage: {
      rpc: {
        plan:
          "free" as const,
        accessKeyLimit:
          16,
        transactionLimit:
          16,
        receiptLimit:
          24,
        fungibleTokenLimit:
          16,
        providerRequestBudget:
          8,
        providerRequestsUsed:
          2,
        indexedHistoryAvailable:
          false,
        coverage:
          "partial" as const,
        unavailableEvidence:
          [],
      },

      indexed:
        null,
    },

    modules:
      {} as never,

    findings:
      [],

    caveats:
      [],
  };

test(
  "builds NEAR timeline and graph from explicit counterparties",
  () => {
    const timeline =
      buildNearActivityTimeline(
        DATA
      );

    const graph =
      buildNearVisualEvidenceGraph(
        DATA
      );

    assert.equal(
      timeline.events[0]
        ?.counterparty,
      "funder.near"
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
