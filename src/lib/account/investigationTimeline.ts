import {
  compareHistoricalSnapshots,
  parseHistoricalSnapshot,
} from "@/lib/account/historicalChanges";

import type {
  HistoricalChange,
} from "@/lib/account/historicalChanges";

export type InvestigationTimelineEntryKind =
  | "saved_analysis"
  | "automatic_baseline"
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

  historySnapshotCount:
    number;

  automaticSnapshotCount:
    number;

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

  kind?:
    | "saved_analysis"
    | "automatic_baseline";
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

const NEAR_DUPLICATE_MS =
  5 * 60 * 1000;

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

  const parsedHistory =
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

              kind:
                row.kind ??
                "saved_analysis" as const,

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

  /*
   * A manually saved analysis and its
   * automatic baseline may represent
   * the same evidence moment.
   *
   * Collapse equal evidence observed
   * inside the five-minute window and
   * prefer the manually curated record.
   */
  const history:
    typeof parsedHistory =
      [];

  for (
    const item of
    parsedHistory
  ) {
    const previous =
      history.length >
        0
        ? history[
            history.length -
              1
          ]
        : null;

    if (previous) {
      const delta =
        Math.abs(
          timeValue(
            item.snapshot
              .capturedAt
          ) -
          timeValue(
            previous.snapshot
              .capturedAt
          )
        );

      const comparison =
        compareHistoricalSnapshots(
          previous.snapshot,
          item.snapshot
        );

      if (
        delta <=
          NEAR_DUPLICATE_MS &&
        comparison &&
        !comparison.hasChanges
      ) {
        if (
          previous.kind ===
            "automatic_baseline" &&
          item.kind ===
            "saved_analysis"
        ) {
          history[
            history.length -
              1
          ] =
            item;
        }

        continue;
      }
    }

    history.push(
      item
    );
  }

  const entries:
    InvestigationTimelineEntry[] =
      [];

  for (
    let index = 0;
    index <
    history.length;
    index += 1
  ) {
    const current =
      history[index];

    const previous =
      index >
      0
        ? history[
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
        `${
          current.kind ===
            "automatic_baseline"
            ? "automatic"
            : "saved"
        }:${current.id}`,

      kind:
        current.kind,

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

  const currentAlreadyStored =
    parsedCurrent
      ? history.some(
          item => {
            const delta =
              Math.abs(
                timeValue(
                  item.snapshot
                    .capturedAt
                ) -
                timeValue(
                  parsedCurrent
                    .capturedAt
                )
              );

            const comparison =
              compareHistoricalSnapshots(
                item.snapshot,
                parsedCurrent
              );

            return (
              delta <=
                NEAR_DUPLICATE_MS &&
              comparison !==
                null &&
              !comparison.hasChanges
            );
          }
        )
      : false;

  if (
    parsedCurrent &&
    parsedCurrent.network ===
      input.network &&
    !currentAlreadyStored
  ) {
    const previous =
      history.length >
      0
        ? history[
            history.length -
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

  const automaticSnapshotCount =
    history.filter(
      item =>
        item.kind ===
        "automatic_baseline"
    ).length;

  const savedSnapshotCount =
    history.filter(
      item =>
        item.kind ===
        "saved_analysis"
    ).length;

  return {
    version:
      1,

    status:
      history.length >
      0
        ? "ready"
        : "no-history",

    historySnapshotCount:
      history.length,

    automaticSnapshotCount,

    savedSnapshotCount,

    entries:
      visibleEntries,

    limitation:
      "Investigation Timeline is a bounded AYZO evidence chronology built from automatic baselines, manually Saved Analyses and the current analysis. It is not an exhaustive blockchain history.",
  };
}
