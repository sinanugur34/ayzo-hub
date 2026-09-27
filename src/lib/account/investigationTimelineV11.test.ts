import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvestigationTimeline,
} from "./investigationTimeline";

import type {
  HistoricalSnapshotV1,
} from "./historicalSnapshot";

function snapshot(
  capturedAt:
    string,
  transactionCount:
    number
): HistoricalSnapshotV1 {
  return {
    version:
      1,

    capturedAt,

    network:
      "ethereum",

    coverage:
      "complete",

    subjectKind:
      "wallet",

    metrics: {
      transactionCount,
    },

    modules:
      {},

    findings:
      [],
  };
}

test(
  "timeline combines automatic and manually saved evidence history",
  () => {
    const timeline =
      buildInvestigationTimeline({
        network:
          "ethereum",

        savedSnapshots: [
          {
            id:
              "automatic-1",

            createdAt:
              "2026-09-27T10:00:10.000Z",

            kind:
              "automatic_baseline",

            analysisPayload:
              snapshot(
                "2026-09-27T10:00:00.000Z",
                1
              ),
          },

          {
            id:
              "saved-duplicate",

            createdAt:
              "2026-09-27T10:01:10.000Z",

            kind:
              "saved_analysis",

            analysisPayload:
              snapshot(
                "2026-09-27T10:01:00.000Z",
                1
              ),
          },

          {
            id:
              "automatic-2",

            createdAt:
              "2026-09-27T11:00:10.000Z",

            kind:
              "automatic_baseline",

            analysisPayload:
              snapshot(
                "2026-09-27T11:00:00.000Z",
                2
              ),
          },
        ],

        currentSnapshot:
          snapshot(
            "2026-09-27T12:00:00.000Z",
            3
          ),
      });

    assert.equal(
      timeline.status,
      "ready"
    );

    assert.equal(
      timeline.historySnapshotCount,
      2
    );

    assert.equal(
      timeline.savedSnapshotCount,
      1
    );

    assert.equal(
      timeline.automaticSnapshotCount,
      1
    );

    assert.equal(
      timeline.entries[0]
        ?.kind,
      "current_analysis"
    );

    assert.equal(
      timeline.entries[1]
        ?.kind,
      "automatic_baseline"
    );

    assert.equal(
      timeline.entries[2]
        ?.kind,
      "saved_analysis"
    );
  }
);
