import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_SNAPSHOT_DEDUPE_WINDOW_MS,
  EVIDENCE_SNAPSHOT_RETENTION,
  evidenceSnapshotDedupeBucket,
  evidenceSnapshotFingerprint,
  serverCapturedSnapshot,
} from "./evidenceSnapshots";

import type {
  HistoricalSnapshotV1,
} from "./historicalSnapshot";

function sample(
  capturedAt:
    string
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
      transactionCount:
        4,
    },

    modules: {
      funding:
        "complete",
    },

    findings: [
      {
        id:
          "finding-1",

        category:
          "funding",

        severity:
          null,

        confidence:
          "high",

        title:
          "Observed funding path",
      },
    ],
  };
}

test(
  "automatic Evidence History retains twenty baselines per subject",
  () => {
    assert.equal(
      EVIDENCE_SNAPSHOT_RETENTION,
      20
    );
  }
);

test(
  "evidence fingerprint ignores capture time",
  () => {
    const first =
      sample(
        "2026-09-27T10:00:00.000Z"
      );

    const second =
      sample(
        "2026-09-27T11:00:00.000Z"
      );

    assert.equal(
      evidenceSnapshotFingerprint(
        first
      ),
      evidenceSnapshotFingerprint(
        second
      )
    );

    second.metrics
      .transactionCount =
      5;

    assert.notEqual(
      evidenceSnapshotFingerprint(
        first
      ),
      evidenceSnapshotFingerprint(
        second
      )
    );
  }
);

test(
  "dedupe uses five-minute windows",
  () => {
    assert.equal(
      EVIDENCE_SNAPSHOT_DEDUPE_WINDOW_MS,
      300000
    );

    assert.equal(
      evidenceSnapshotDedupeBucket(
        600000
      ),
      2
    );

    assert.equal(
      evidenceSnapshotDedupeBucket(
        899999
      ),
      2
    );

    assert.equal(
      evidenceSnapshotDedupeBucket(
        900000
      ),
      3
    );
  }
);

test(
  "persisted chronology uses server capture time",
  () => {
    const source =
      sample(
        "2000-01-01T00:00:00.000Z"
      );

    const captured =
      serverCapturedSnapshot(
        source,
        Date.parse(
          "2026-09-27T17:45:00.000Z"
        )
      );

    assert.equal(
      captured.capturedAt,
      "2026-09-27T17:45:00.000Z"
    );

    assert.equal(
      source.capturedAt,
      "2000-01-01T00:00:00.000Z"
    );
  }
);
