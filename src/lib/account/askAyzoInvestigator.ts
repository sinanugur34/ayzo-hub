import {
  buildAyzoEntityLabels,
} from "@/lib/account/ayzoEntityLabels";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildInvestigationTimeline,
} from "@/lib/account/investigationTimeline";

import type {
  StoredInvestigationSnapshot,
} from "@/lib/account/investigationTimeline";

type JsonRecord =
  Record<string, unknown>;

export type AskAyzoInvestigatorHistoryReadStatus =
  | "ready"
  | "partial"
  | "unavailable";

export type AskAyzoInvestigatorContextV1 = {
  version:
    1;

  source:
    "ayzo_server_bounded_context";

  network:
    string;

  subjectType:
    string;

  subjectValue:
    string;

  historyReadStatus:
    AskAyzoInvestigatorHistoryReadStatus;

  timeline: {
    entries:
      readonly {
        kind:
          string;

        capturedAt:
          string;

        coverage:
          string | null;

        changeCount:
          number;

        hasChanges:
          boolean;

        changes:
          readonly {
            category:
              string;

            key:
              string;

            label:
              string;

            direction:
              string;

            before:
              unknown;

            after:
              unknown;
          }[];
      }[];

    status:
      string;

    historySnapshotCount:
      number;

    automaticSnapshotCount:
      number;

    savedSnapshotCount:
      number;

    limitation:
      string;
  };

  entityLabels: {
    labels:
      readonly {
        address:
          string;

        label:
          string;

        category:
          string;

        confidence:
          string;

        source:
          string;

        evidence:
          string;

        caveat:
          string | null;
      }[];

    status:
      string;

    limitation:
      string;
  };

  limitation:
    string;
};

function record(
  value:
    unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  )
    ? value as
      JsonRecord
    : null;
}

export function buildAskAyzoInvestigatorContext({
  network,
  subjectType,
  subjectValue,
  evidencePayload,
  automaticSnapshots,
  savedSnapshots,
  historyReadStatus,
}: {
  network:
    string;

  subjectType:
    string;

  subjectValue:
    string;

  evidencePayload:
    unknown;

  automaticSnapshots:
    readonly StoredInvestigationSnapshot[];

  savedSnapshots:
    readonly StoredInvestigationSnapshot[];

  historyReadStatus:
    AskAyzoInvestigatorHistoryReadStatus;
}): AskAyzoInvestigatorContextV1 {
  /*
   * Build a current normalized snapshot
   * without persisting anything.
   *
   * Ask AYZO investigation must remain
   * read-only with respect to Evidence
   * History.
   */
  const currentSnapshot =
    buildHistoricalSnapshot(
      network,
      evidencePayload
    );

  const timeline =
    buildInvestigationTimeline({
      network,

      savedSnapshots: [
        ...automaticSnapshots,
        ...savedSnapshots,
      ],

      currentSnapshot,

      maxEntries:
        8,

      maxChangesPerEntry:
        4,
    });

  const labels =
    buildAyzoEntityLabels({
      network,
      subjectType,
      subjectValue,
      evidencePayload,
    });

  return {
    version:
      1,

    source:
      "ayzo_server_bounded_context",

    network,

    subjectType,

    subjectValue,

    historyReadStatus,

    timeline: {
      /*
       * Entries intentionally appear
       * first. Semantic evidence
       * collection is bounded and should
       * prioritize actual chronology
       * before metadata.
       */
      entries:
        timeline.entries
          .slice(
            0,
            8
          )
          .map(
            entry => ({
              kind:
                entry.kind,

              capturedAt:
                entry.capturedAt,

              coverage:
                entry.coverage,

              changeCount:
                entry.changeCount,

              hasChanges:
                entry.hasChanges,

              changes:
                entry.changes
                  .slice(
                    0,
                    4
                  )
                  .map(
                    change => ({
                      category:
                        change.category,

                      key:
                        change.key,

                      label:
                        change.label,

                      direction:
                        change.direction,

                      before:
                        change.before,

                      after:
                        change.after,
                    })
                  ),
            })
          ),

      status:
        timeline.status,

      historySnapshotCount:
        timeline.historySnapshotCount,

      automaticSnapshotCount:
        timeline
          .automaticSnapshotCount,

      savedSnapshotCount:
        timeline.savedSnapshotCount,

      limitation:
        timeline.limitation,
    },

    entityLabels: {
      /*
       * Labels intentionally appear
       * first for the same bounded
       * semantic-evidence reason.
       */
      labels:
        labels.labels
          .slice(
            0,
            8
          )
          .map(
            label => ({
              address:
                label.address,

              label:
                label.label,

              category:
                label.category,

              confidence:
                label.confidence,

              source:
                label.source,

              evidence:
                label.evidence,

              caveat:
                label.caveat,
            })
          ),

      status:
        labels.status,

      limitation:
        labels.limitation,
    },

    limitation:
      "Ask AYZO Investigator uses only the current bounded analysis plus a bounded, signed-in-user evidence chronology and evidence-backed entity roles when available. History availability does not imply exhaustive blockchain coverage, and chronology does not establish causation, ownership, identity, intent or affiliation.",
  };
}

/*
 * Preserve the existing current-analysis
 * top-level evidence shape.
 *
 * The semantic layer already distributes
 * its evidence budget across top-level
 * sections. Adding three dedicated
 * server sections prevents investigation
 * memory from suppressing current evidence.
 */
export function attachAskAyzoInvestigatorContext(
  evidencePayload:
    unknown,
  context:
    AskAyzoInvestigatorContextV1
) {
  const root =
    record(
      evidencePayload
    );

  if (root) {
    return {
      ...root,

      ayzoInvestigatorTimeline: {
        entries:
          context.timeline
            .entries,

        status:
          context.timeline
            .status,

        historySnapshotCount:
          context.timeline
            .historySnapshotCount,

        automaticSnapshotCount:
          context.timeline
            .automaticSnapshotCount,

        savedSnapshotCount:
          context.timeline
            .savedSnapshotCount,

        historyReadStatus:
          context
            .historyReadStatus,

        limitation:
          context.timeline
            .limitation,
      },

      ayzoInvestigatorLabels: {
        labels:
          context.entityLabels
            .labels,

        status:
          context.entityLabels
            .status,

        limitation:
          context.entityLabels
            .limitation,
      },

      ayzoInvestigatorMeta: {
        version:
          context.version,

        source:
          context.source,

        network:
          context.network,

        subjectType:
          context.subjectType,

        subjectValue:
          context.subjectValue,

        historyReadStatus:
          context
            .historyReadStatus,

        limitation:
          context.limitation,
      },
    };
  }

  return {
    currentEvidence:
      evidencePayload,

    ayzoInvestigatorTimeline: {
      entries:
        context.timeline
          .entries,

      status:
        context.timeline
          .status,

      historySnapshotCount:
        context.timeline
          .historySnapshotCount,

      automaticSnapshotCount:
        context.timeline
          .automaticSnapshotCount,

      savedSnapshotCount:
        context.timeline
          .savedSnapshotCount,

      historyReadStatus:
        context
          .historyReadStatus,

      limitation:
        context.timeline
          .limitation,
    },

    ayzoInvestigatorLabels: {
      labels:
        context.entityLabels
          .labels,

      status:
        context.entityLabels
          .status,

      limitation:
        context.entityLabels
          .limitation,
    },

    ayzoInvestigatorMeta: {
      version:
        context.version,

      source:
        context.source,

      network:
        context.network,

      subjectType:
        context.subjectType,

      subjectValue:
        context.subjectValue,

      historyReadStatus:
        context
          .historyReadStatus,

      limitation:
        context.limitation,
    },
  };
}
