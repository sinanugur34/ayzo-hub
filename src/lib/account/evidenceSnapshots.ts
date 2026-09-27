import {
  createHash,
} from "node:crypto";

import type {
  HistoricalSnapshotV1,
} from "@/lib/account/historicalSnapshot";

export const EVIDENCE_SNAPSHOT_RETENTION =
  20;

export const EVIDENCE_SNAPSHOT_DEDUPE_WINDOW_MS =
  5 * 60 * 1000;

function canonicalize(
  value:
    unknown
): unknown {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      canonicalize
    );
  }

  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return value;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return Object.fromEntries(
    Object.keys(
      record
    )
      .sort()
      .map(
        key => [
          key,
          canonicalize(
            record[key]
          ),
        ]
      )
  );
}

export function evidenceSnapshotFingerprint(
  snapshot:
    HistoricalSnapshotV1
) {
  /*
   * capturedAt is intentionally excluded.
   * Fingerprint represents evidence content,
   * not the time it was observed.
   */
  const evidence = {
    version:
      snapshot.version,

    network:
      snapshot.network,

    coverage:
      snapshot.coverage,

    subjectKind:
      snapshot.subjectKind,

    metrics:
      snapshot.metrics,

    modules:
      snapshot.modules,

    findings:
      snapshot.findings,
  };

  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        canonicalize(
          evidence
        )
      )
    )
    .digest(
      "hex"
    );
}

export function evidenceSnapshotDedupeBucket(
  nowMs:
    number = Date.now()
) {
  if (
    !Number.isFinite(
      nowMs
    ) ||
    nowMs < 0
  ) {
    throw new Error(
      "Invalid evidence snapshot time."
    );
  }

  return Math.floor(
    nowMs /
      EVIDENCE_SNAPSHOT_DEDUPE_WINDOW_MS
  );
}

export function serverCapturedSnapshot(
  snapshot:
    HistoricalSnapshotV1,
  nowMs:
    number = Date.now()
): HistoricalSnapshotV1 {
  if (
    !Number.isFinite(
      nowMs
    ) ||
    nowMs < 0
  ) {
    throw new Error(
      "Invalid server capture time."
    );
  }

  return {
    ...snapshot,

    capturedAt:
      new Date(
        nowMs
      ).toISOString(),
  };
}
