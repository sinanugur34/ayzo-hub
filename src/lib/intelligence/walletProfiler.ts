import type {
  WalletTrackRecord,
  WalletTrackRecordMetric,
} from "@/lib/intelligence/walletTrackRecord";

export type WalletProfileSectionId =
  | "activity"
  | "funding"
  | "relationships";

export type WalletProfileSection = {
  id:
    WalletProfileSectionId;

  title:
    string;

  description:
    string;

  metrics:
    readonly WalletTrackRecordMetric[];
};

export type WalletProfile = {
  version:
    1;

  status:
    WalletTrackRecord["status"];

  firstObservedAt:
    string | null;

  lastObservedAt:
    string | null;

  observedSpanDays:
    number | null;

  evidenceMetricCount:
    number;

  sections:
    readonly WalletProfileSection[];

  limitation:
    string;

  methodology:
    string;

  evidenceState:
    "SUPPORTED";
};

function metricSearchText(
  metric:
    WalletTrackRecordMetric
) {
  return `${metric.id} ${metric.label}`
    .toLocaleLowerCase(
      "en-US"
    );
}

function classifyMetric(
  metric:
    WalletTrackRecordMetric
): WalletProfileSectionId {
  const value =
    metricSearchText(
      metric
    );

  if (
    value.includes(
      "funding"
    )
  ) {
    return "funding";
  }

  if (
    value.includes(
      "counterpart"
    ) ||
    value.includes(
      "relationship"
    ) ||
    value.includes(
      "interaction"
    ) ||
    value.includes(
      "shared transaction"
    ) ||
    value.includes(
      "shared-transaction"
    ) ||
    value.includes(
      "direct relation"
    ) ||
    value.includes(
      "direct-relation"
    )
  ) {
    return "relationships";
  }

  return "activity";
}

const SECTION_COPY:
  Record<
    WalletProfileSectionId,
    {
      title:
        string;

      description:
        string;
    }
  > = {
  activity: {
    title:
      "Activity footprint",

    description:
      "Observed transaction and transfer evidence from the bounded analysis window.",
  },

  funding: {
    title:
      "Funding evidence",

    description:
      "Observed funding-source evidence only; not ultimate source-of-funds attribution.",
  },

  relationships: {
    title:
      "Relationship evidence",

    description:
      "Observed counterparties and interactions without common-ownership inference.",
  },
};

export function buildWalletProfile(
  record:
    WalletTrackRecord
): WalletProfile {
  const groups:
    Record<
      WalletProfileSectionId,
      WalletTrackRecordMetric[]
    > = {
    activity:
      [],

    funding:
      [],

    relationships:
      [],
  };

  for (
    const metric of
    record.metrics
  ) {
    groups[
      classifyMetric(
        metric
      )
    ].push(
      metric
    );
  }

  const sections:
    WalletProfileSection[] =
      (
        [
          "activity",
          "funding",
          "relationships",
        ] as const
      )
        .filter(
          id =>
            groups[id]
              .length >
            0
        )
        .map(
          id => ({
            id,

            title:
              SECTION_COPY[
                id
              ].title,

            description:
              SECTION_COPY[
                id
              ].description,

            metrics:
              groups[id],
          })
        );

  return {
    version:
      1,

    status:
      record.status,

    firstObservedAt:
      record.firstObservedAt,

    lastObservedAt:
      record.lastObservedAt,

    observedSpanDays:
      record.observedSpanDays,

    evidenceMetricCount:
      record.metrics.length,

    sections,

    limitation:
      record.limitation,

    methodology:
      `${record.methodology} Wallet Profiler reorganizes existing AYZO evidence only; it does not create a risk score, profitability score, identity claim, ownership claim, intent inference or prediction.`,

    evidenceState:
      "SUPPORTED",
  };
}
