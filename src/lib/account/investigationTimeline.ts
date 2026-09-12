import {
  compareHistoricalSnapshots,
  parseHistoricalSnapshot,
} from "@/lib/account/historicalChanges";

import type {
  HistoricalChange,
} from "@/lib/account/historicalChanges";

export type InvestigationTimelineEntryKind =
  | "saved_analysis"
  | "current_analysis";

export type InvestigationTimelineEntry = {
  id: string;

  kind:
    InvestigationTimelineEntryKind;

  capturedAt:
    string;

  savedAt:
    string | null;

  coverage:
    string | null;

  changeCount:
    number;

  hasChanges:
    boolean;

  changes:
    readonly HistoricalChange[];
};

export type InvestigationTimelineV1 = {
  version: 1;

  status:
    | "ready"
    | "no-history";

  savedSnapshotCount:
    number;

  entries:
    readonly InvestigationTimelineEntry[];

  limitation:
    string;
};

export type StoredInvestigationSnapshot = {
  id: string;

  createdAt:
    string;

  analysisPayload:
    unknown;
};

type BuildInvestigationTimelineInput = {
  network:
    string;

  savedSnapshots:
    readonly StoredInvestigationSnapshot[];

  currentSnapshot?:
    unknown;

  maxEntries?:
    number;

  maxChangesPerEntry?:
    number;
};

function timeValue(
  value:
    string
) {
  const parsed =
    Date.parse(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

export function buildInvestigationTimeline(
  input:
    BuildInvestigationTimelineInput
): InvestigationTimelineV1 {
  const maxEntries =
    Math.min(
      20,
      Math.max(
        1,
        input.maxEntries ??
          12
      )
    );

  const maxChangesPerEntry =
    Math.min(
      8,
      Math.max(
        1,
        input.maxChangesPerEntry ??
          5
      )
    );

  const saved =
    input.savedSnapshots
      .flatMap(
        row => {
          const snapshot =
            parseHistoricalSnapshot(
              row.analysisPayload
            );

          if (
            !snapshot ||
            snapshot.network !==
              input.network
          ) {
            return [];
          }

          return [
            {
              id:
                row.id,

              createdAt:
                row.createdAt,

              snapshot,
            },
          ];
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          timeValue(
            left.snapshot
              .capturedAt
          ) -
          timeValue(
            right.snapshot
              .capturedAt
          )
      );

  const entries:
    InvestigationTimelineEntry[] =
      [];

  for (
    let index = 0;
    index <
    saved.length;
    index += 1
  ) {
    const current =
      saved[index];

    const previous =
      index >
      0
        ? saved[
            index - 1
          ]
        : null;

    const comparison =
      previous
        ? compareHistoricalSnapshots(
            previous.snapshot,
            current.snapshot
          )
        : null;

    entries.push({
      id:
        `saved:${current.id}`,

      kind:
        "saved_analysis",

      capturedAt:
        current.snapshot
          .capturedAt,

      savedAt:
        current.createdAt,

      coverage:
        current.snapshot
          .coverage,

      changeCount:
        comparison
          ?.changeCount ??
        0,

      hasChanges:
        comparison
          ?.hasChanges ??
        false,

      changes:
        comparison
          ?.changes
          .slice(
            0,
            maxChangesPerEntry
          ) ??
        [],
    });
  }

  const parsedCurrent =
    input.currentSnapshot ===
      undefined ||
    input.currentSnapshot ===
      null
      ? null
      : parseHistoricalSnapshot(
          input.currentSnapshot
        );

  if (
    parsedCurrent &&
    parsedCurrent.network ===
      input.network
  ) {
    const previous =
      saved.length >
      0
        ? saved[
            saved.length -
              1
          ].snapshot
        : null;

    const comparison =
      previous
        ? compareHistoricalSnapshots(
            previous,
            parsedCurrent
          )
        : null;

    entries.push({
      id:
        `current:${parsedCurrent.capturedAt}`,

      kind:
        "current_analysis",

      capturedAt:
        parsedCurrent
          .capturedAt,

      savedAt:
        null,

      coverage:
        parsedCurrent
          .coverage,

      changeCount:
        comparison
          ?.changeCount ??
        0,

      hasChanges:
        comparison
          ?.hasChanges ??
        false,

      changes:
        comparison
          ?.changes
          .slice(
            0,
            maxChangesPerEntry
          ) ??
        [],
    });
  }

  /*
   * Newest research milestone
   * appears first.
   */
  const visibleEntries =
    entries
      .sort(
        (
          left,
          right
        ) =>
          timeValue(
            right.capturedAt
          ) -
          timeValue(
            left.capturedAt
          )
      )
      .slice(
        0,
        maxEntries
      );

  return {
    version:
      1,

    status:
      saved.length >
      0
        ? "ready"
        : "no-history",

    savedSnapshotCount:
      saved.length,

    entries:
      visibleEntries,

    limitation:
      "Investigation Timeline is built from AYZO saved analysis snapshots and the current analysis only. It is a bounded research chronology, not an exhaustive blockchain history.",
  };
}
