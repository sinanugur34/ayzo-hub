import assert from "node:assert/strict";
import test from "node:test";

import {
  attachAskAyzoInvestigatorContext,
  buildAskAyzoInvestigatorContext,
} from "./askAyzoInvestigator";

import {
  buildHistoricalSnapshot,
} from "./historicalSnapshot";

function evmEvidence(
  counterparties:
    number,
  fundingSources:
    number
) {
  return {
    coverage:
      "full",

    assetKind:
      "wallet",

    moduleSummary: {
      total:
        9,

      complete:
        9,

      limited:
        0,

      notRun:
        0,

      unavailable:
        0,
    },

    modules: {
      walletRelationships: {
        status:
          "complete",

        data: {
          counterpartyCount:
            counterparties,

          interactionCount:
            counterparties * 2,

          lastSeen:
            "2026-09-27T18:00:00.000Z",
        },
      },

      fundingProvenance: {
        status:
          "complete",

        data: {
          fundingSourceCount:
            fundingSources,

          fundingObservationCount:
            fundingSources * 2,

          lastSeen:
            "2026-09-27T17:00:00.000Z",

          sources: [
            {
              sourceAddress:
                "0x2222222222222222222222222222222222222222",

              repeatedFundingSource:
                true,
            },
          ],
        },
      },
    },

    findings:
      [],
  };
}

test(
  "Investigator combines bounded current and historical evidence without persistence",
  () => {
    const previous =
      buildHistoricalSnapshot(
        "ethereum",
        evmEvidence(
          2,
          1
        )
      );

    assert.ok(
      previous
    );

    const context =
      buildAskAyzoInvestigatorContext({
        network:
          "ethereum",

        subjectType:
          "wallet",

        subjectValue:
          "0x1111111111111111111111111111111111111111",

        evidencePayload:
          evmEvidence(
            5,
            3
          ),

        automaticSnapshots: [
          {
            id:
              "automatic-1",

            createdAt:
              "2026-09-20T12:00:00.000Z",

            analysisPayload: {
              ...previous,

              capturedAt:
                "2026-09-20T12:00:00.000Z",
            },

            kind:
              "automatic_baseline",
          },
        ],

        savedSnapshots:
          [],

        historyReadStatus:
          "ready",
      });

    assert.equal(
      context.version,
      1
    );

    assert.equal(
      context.source,
      "ayzo_server_bounded_context"
    );

    assert.equal(
      context.timeline
        .historySnapshotCount,
      1
    );

    assert.equal(
      context.timeline
        .automaticSnapshotCount,
      1
    );

    assert.equal(
      context.historyReadStatus,
      "ready"
    );

    assert.ok(
      context.timeline
        .entries.length >=
      1
    );
  }
);

test(
  "Investigator exposes evidence-backed entity roles only",
  () => {
    const context =
      buildAskAyzoInvestigatorContext({
        network:
          "ethereum",

        subjectType:
          "wallet",

        subjectValue:
          "0x1111111111111111111111111111111111111111",

        evidencePayload:
          evmEvidence(
            2,
            2
          ),

        automaticSnapshots:
          [],

        savedSnapshots:
          [],

        historyReadStatus:
          "ready",
      });

    assert.equal(
      context.entityLabels
        .status,
      "ready"
    );

    assert.ok(
      context.entityLabels
        .labels.some(
          label =>
            label.label ===
            "Repeated funding source"
        )
    );

    assert.match(
      context.limitation,
      /does not establish causation, ownership, identity, intent or affiliation/
    );
  }
);

test(
  "Investigator attachment preserves current top-level analysis evidence",
  () => {
    const current =
      evmEvidence(
        4,
        2
      );

    const context =
      buildAskAyzoInvestigatorContext({
        network:
          "ethereum",

        subjectType:
          "wallet",

        subjectValue:
          "0x1111111111111111111111111111111111111111",

        evidencePayload:
          current,

        automaticSnapshots:
          [],

        savedSnapshots:
          [],

        historyReadStatus:
          "unavailable",
      });

    const attached =
      attachAskAyzoInvestigatorContext(
        current,
        context
      ) as Record<
        string,
        unknown
      >;

    assert.equal(
      attached.coverage,
      "full"
    );

    assert.ok(
      attached.modules
    );

    assert.ok(
      attached
        .ayzoInvestigatorTimeline
    );

    assert.ok(
      attached
        .ayzoInvestigatorLabels
    );

    assert.ok(
      attached
        .ayzoInvestigatorMeta
    );
  }
);

test(
  "Investigator chronology remains bounded",
  () => {
    const snapshots =
      Array.from(
        {
          length:
            20,
        },
        (
          _,
          index
        ) => {
          const snapshot =
            buildHistoricalSnapshot(
              "ethereum",
              evmEvidence(
                index + 1,
                1
              )
            );

          assert.ok(
            snapshot
          );

          const capturedAt =
            new Date(
              Date.UTC(
                2026,
                8,
                index + 1
              )
            ).toISOString();

          return {
            id:
              `history-${index}`,

            createdAt:
              capturedAt,

            analysisPayload: {
              ...snapshot,

              capturedAt,
            },

            kind:
              "automatic_baseline" as const,
          };
        }
      );

    const context =
      buildAskAyzoInvestigatorContext({
        network:
          "ethereum",

        subjectType:
          "wallet",

        subjectValue:
          "0x1111111111111111111111111111111111111111",

        evidencePayload:
          evmEvidence(
            22,
            2
          ),

        automaticSnapshots:
          snapshots,

        savedSnapshots:
          [],

        historyReadStatus:
          "ready",
      });

    assert.ok(
      context.timeline
        .entries.length <=
      8
    );

    for (
      const entry of
      context.timeline.entries
    ) {
      assert.ok(
        entry.changes
          .length <=
        4
      );
    }
  }
);
