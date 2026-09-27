import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFundTracer,
} from "./fundTracer";

import type {
  ActivityTimeline,
} from "./activityTimeline";

import type {
  VisualEvidenceGraph,
} from "./visualEvidenceGraph";

function graphWithFunding():
  VisualEvidenceGraph {
  return {
    status:
      "limited",

    nodes: [
      {
        id:
          "source",

        kind:
          "funding_source",

        label:
          "0x2222222222222222222222222222222222222222",

        detail:
          "Observed source",

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "root",

        kind:
          "root_wallet",

        label:
          "0x1111111111111111111111111111111111111111",

        detail:
          "Analyzed wallet",

        evidenceState:
          "SUPPORTED",
      },
    ],

    edges: [
      {
        id:
          "funding-edge",

        source:
          "source",

        target:
          "root",

        kind:
          "funding",

        direction:
          "forward",

        label:
          "Observed funding",

        evidenceState:
          "SUPPORTED",

        evidenceCount:
          1,

        evidenceRefs: [
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ],
      },
    ],

    limitation:
      "Bounded graph.",

    coverage: {
      maxNodes:
        8,

      maxEdges:
        12,

      ownershipInference:
        false,
    },
  };
}

function timeline():
  ActivityTimeline {
  return {
    status:
      "limited",

    limitation:
      "Bounded timeline.",

    events: [
      {
        id:
          "event-1",

        timestamp:
          "2026-09-27T18:00:00.000Z",

        blockNumber:
          100,

        kind:
          "native_transfer",

        direction:
          "incoming",

        from:
          "0x2222222222222222222222222222222222222222",

        to:
          "0x1111111111111111111111111111111111111111",

        counterparty:
          "0x2222222222222222222222222222222222222222",

        asset:
          "ETH",

        assetAddress:
          null,

        rawValue:
          "1000000000000000000",

        formattedValue:
          "1",

        transactionHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

        evidenceState:
          "SUPPORTED",

        whyItMatters:
          "Observed incoming funding.",
      },
    ],

    evidenceWindow: {
      transactionCount:
        1,

      transferCount:
        0,

      maxEvents:
        12,
    },
  };
}

test(
  "Fund Tracer builds a direct observed funding route",
  () => {
    const tracer =
      buildFundTracer({
        graph:
          graphWithFunding(),

        timeline:
          timeline(),
      });

    assert.equal(
      tracer.status,
      "available"
    );

    assert.equal(
      tracer.directPathCount,
      1
    );

    assert.equal(
      tracer.multiHopPathCount,
      0
    );

    assert.equal(
      tracer.maxObservedHops,
      1
    );

    assert.equal(
      tracer.paths[0]
        ?.evidence[0]
        ?.formattedValue,
      "1"
    );

    assert.equal(
      tracer.paths[0]
        ?.evidence[0]
        ?.asset,
      "ETH"
    );
  }
);

test(
  "Fund Tracer does not fabricate a route without funding edges",
  () => {
    const graph = {
      ...graphWithFunding(),

      edges:
        [],
    };

    const tracer =
      buildFundTracer({
        graph,

        timeline:
          timeline(),
      });

    assert.equal(
      tracer.status,
      "unavailable"
    );

    assert.equal(
      tracer.paths.length,
      0
    );
  }
);

test(
  "Advanced Fund Tracer adds existing bounded multi-hop Deep Funding routes",
  () => {
    const tracer =
      buildFundTracer({
        graph:
          graphWithFunding(),

        timeline:
          timeline(),

        deepFunding: {
          maxDepthReached:
            3,

          paths: [
            {
              sourceAddress:
                "0x3333333333333333333333333333333333333333",

              hopCount:
                3,

              addresses: [
                "0x3333333333333333333333333333333333333333",
                "0x2222222222222222222222222222222222222222",
                "0x4444444444444444444444444444444444444444",
                "0x1111111111111111111111111111111111111111",
              ],

              evidenceTransactionHashes: [
                "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              ],
            },
          ],

          coverage: {
            truncated:
              false,

            limitation:
              "Deep funding is bounded.",
          },
        },
      });

    assert.equal(
      tracer.directPathCount,
      1
    );

    assert.equal(
      tracer.multiHopPathCount,
      1
    );

    assert.equal(
      tracer.maxObservedHops,
      3
    );

    assert.equal(
      tracer.coverage
        .includesMultiHopFunding,
      true
    );

    assert.equal(
      tracer.paths.some(
        path =>
          path.kind ===
          "multi_hop"
      ),
      true
    );
  }
);

test(
  "Fund Tracer explicitly blocks ownership and ultimate-origin inference",
  () => {
    const tracer =
      buildFundTracer({
        graph:
          graphWithFunding(),

        timeline:
          timeline(),
      });

    assert.equal(
      tracer.coverage
        .ownershipInference,
      false
    );

    assert.equal(
      tracer.coverage
        .ultimateOriginInference,
      false
    );

    assert.match(
      tracer.limitation,
      /does not infer a wallet's ultimate source of funds/
    );

    assert.match(
      tracer.limitation,
      /does not establish identity, common ownership, control, intent/
    );
  }
);
