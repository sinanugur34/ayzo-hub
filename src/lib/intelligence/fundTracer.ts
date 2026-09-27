import type {
  ActivityTimeline,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

import type {
  VisualEvidenceGraph,
} from "@/lib/intelligence/visualEvidenceGraph";

export type FundTracerDeepFundingInput = {
  maxDepthReached:
    number;

  paths:
    readonly {
      sourceAddress:
        string;

      hopCount:
        number;

      addresses:
        readonly string[];

      evidenceTransactionHashes:
        readonly string[];
    }[];

  coverage:
    {
      truncated?:
        boolean;

      limitation?:
        string;
    };
};

export type FundTracerEvidence = {
  transactionHash:
    string;

  timestamp:
    string | null;

  formattedValue:
    string | null;

  asset:
    string | null;

  direction:
    ActivityTimelineEvent["direction"];
};

export type FundTracerPath = {
  id:
    string;

  kind:
    | "direct"
    | "multi_hop";

  hopCount:
    number;

  addresses:
    readonly string[];

  evidenceCount:
    number;

  evidenceRefs:
    readonly string[];

  evidence:
    readonly FundTracerEvidence[];
};

export type FundTracerModel = {
  version:
    1;

  status:
    | "available"
    | "unavailable";

  directPathCount:
    number;

  multiHopPathCount:
    number;

  maxObservedHops:
    number;

  evidenceTransactionCount:
    number;

  paths:
    readonly FundTracerPath[];

  limitation:
    string;

  coverage: {
    includesDirectObservedFunding:
      boolean;

    includesMultiHopFunding:
      boolean;

    ultimateOriginInference:
      false;

    ownershipInference:
      false;
  };
};

function lower(
  value:
    string
) {
  return value
    .trim()
    .toLowerCase();
}

function sameAddress(
  left:
    string | null,
  right:
    string
) {
  return (
    typeof left ===
      "string" &&
    lower(left) ===
      lower(right)
  );
}

function unique(
  values:
    readonly string[]
) {
  return Array.from(
    new Set(
      values.filter(
        value =>
          typeof value ===
            "string" &&
          value.length >
            0
      )
    )
  );
}

function evidenceFromEvents(
  events:
    readonly ActivityTimelineEvent[],
  refs:
    readonly string[],
  sourceAddress?:
    string,
  targetAddress?:
    string
): readonly FundTracerEvidence[] {
  const normalizedRefs =
    new Set(
      refs.map(
        lower
      )
    );

  return events
    .filter(
      event => {
        if (
          normalizedRefs.has(
            lower(
              event.transactionHash
            )
          )
        ) {
          return true;
        }

        /*
         * Some native-network visual graph
         * adapters intentionally omit a TX
         * reference from their funding edge.
         *
         * In that case we only attach timeline
         * evidence when the observed endpoint
         * address matches exactly.
         */
        if (
          normalizedRefs.size ===
            0 &&
          sourceAddress &&
          event.direction ===
            "incoming" &&
          (
            sameAddress(
              event.from,
              sourceAddress
            ) ||
            sameAddress(
              event.counterparty,
              sourceAddress
            )
          )
        ) {
          if (
            !targetAddress ||
            !event.to
          ) {
            return true;
          }

          return sameAddress(
            event.to,
            targetAddress
          );
        }

        return false;
      }
    )
    .map(
      event => ({
        transactionHash:
          event.transactionHash,

        timestamp:
          event.timestamp,

        formattedValue:
          event.formattedValue,

        asset:
          event.asset,

        direction:
          event.direction,
      })
    );
}

export function buildFundTracer({
  graph,
  timeline,
  deepFunding =
    null,
  maxDirectPaths =
    8,
  maxDeepPaths =
    8,
}: {
  graph:
    VisualEvidenceGraph | null;

  timeline:
    ActivityTimeline | null;

  deepFunding?:
    FundTracerDeepFundingInput | null;

  maxDirectPaths?:
    number;

  maxDeepPaths?:
    number;
}): FundTracerModel {
  const events =
    timeline?.events ??
    [];

  const nodeById =
    new Map(
      (
        graph?.nodes ??
        []
      ).map(
        node => [
          node.id,
          node,
        ]
      )
    );

  const directPaths:
    FundTracerPath[] =
      (
        graph?.edges ??
        []
      )
        .filter(
          edge =>
            edge.kind ===
            "funding"
        )
        .sort(
          (
            left,
            right
          ) =>
            right
              .evidenceCount -
            left
              .evidenceCount
        )
        .slice(
          0,
          Math.max(
            0,
            maxDirectPaths
          )
        )
        .flatMap(
          edge => {
            const source =
              nodeById.get(
                edge.source
              );

            const target =
              nodeById.get(
                edge.target
              );

            if (
              !source ||
              !target
            ) {
              return [];
            }

            const matchedEvidence =
              evidenceFromEvents(
                events,
                edge.evidenceRefs,
                source.label,
                target.label
              );

            const evidenceRefs =
              unique([
                ...edge
                  .evidenceRefs,
                ...matchedEvidence.map(
                  item =>
                    item
                      .transactionHash
                ),
              ]);

            return [
              {
                id:
                  `direct:${edge.id}`,

                kind:
                  "direct" as const,

                hopCount:
                  1,

                addresses: [
                  source.label,
                  target.label,
                ],

                evidenceCount:
                  Math.max(
                    edge.evidenceCount,
                    evidenceRefs.length
                  ),

                evidenceRefs,

                evidence:
                  matchedEvidence,
              },
            ];
          }
        );

  /*
   * Deep Funding already contains the
   * direct hop. Dedicated Fund Tracer
   * uses graph evidence for direct paths
   * and adds only genuinely deeper paths
   * here to avoid duplicate routes.
   */
  const multiHopPaths:
    FundTracerPath[] =
      (
        deepFunding
          ?.paths ??
        []
      )
        .filter(
          path =>
            path.hopCount >
            1
        )
        .sort(
          (
            left,
            right
          ) =>
            right.hopCount -
              left.hopCount ||
            left.sourceAddress
              .localeCompare(
                right.sourceAddress
              )
        )
        .slice(
          0,
          Math.max(
            0,
            maxDeepPaths
          )
        )
        .map(
          (
            path,
            index
          ) => {
            const evidenceRefs =
              unique(
                path
                  .evidenceTransactionHashes
              );

            return {
              id:
                `deep:${path.sourceAddress}:${path.hopCount}:${index}`,

              kind:
                "multi_hop" as const,

              hopCount:
                path.hopCount,

              addresses:
                path.addresses,

              evidenceCount:
                evidenceRefs.length,

              evidenceRefs,

              evidence:
                evidenceFromEvents(
                  events,
                  evidenceRefs
                ),
            };
          }
        );

  const paths = [
    ...directPaths,
    ...multiHopPaths,
  ];

  const transactionRefs =
    unique(
      paths.flatMap(
        path =>
          path.evidenceRefs
      )
    );

  const maxObservedHops =
    paths.reduce(
      (
        maximum,
        path
      ) =>
        Math.max(
          maximum,
          path.hopCount
        ),
      0
    );

  const limitations =
    unique([
      "Fund Tracer presents observed funding paths already supported by AYZO evidence. It does not infer a wallet's ultimate source of funds.",
      graph
        ?.limitation ??
        "",
      timeline
        ?.limitation ??
        "",
      deepFunding
        ?.coverage
        ?.limitation ??
        "",
      "Funding-path proximity does not establish identity, common ownership, control, intent, affiliation, illegality or malicious behavior.",
    ]);

  return {
    version:
      1,

    status:
      paths.length >
        0
        ? "available"
        : "unavailable",

    directPathCount:
      directPaths.length,

    multiHopPathCount:
      multiHopPaths.length,

    maxObservedHops,

    evidenceTransactionCount:
      transactionRefs.length,

    paths,

    limitation:
      limitations.join(
        " "
      ),

    coverage: {
      includesDirectObservedFunding:
        directPaths.length >
        0,

      includesMultiHopFunding:
        multiHopPaths.length >
        0,

      ultimateOriginInference:
        false,

      ownershipInference:
        false,
    },
  };
}
