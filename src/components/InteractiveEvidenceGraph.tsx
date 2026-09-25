"use client";

import type {
  VisualEvidenceEdge,
  VisualEvidenceGraph as VisualEvidenceGraphData,
  VisualEvidenceNode,
} from "@/lib/intelligence/visualEvidenceGraph";

import styles from "@/components/AnalysisWorkspaceConcept.module.css";

const WIDTH =
  820;

const HEIGHT =
  440;

type Point = {
  x: number;
  y: number;
};

export type InteractiveEvidenceSelection =
  | {
      type:
        "node";

      id:
        string;

      title:
        string;

      subtitle:
        string;

      detail:
        string | null;

      evidenceCount:
        number;

      evidenceRefs:
        readonly string[];

      related:
        readonly string[];
    }
  | {
      type:
        "edge";

      id:
        string;

      title:
        string;

      subtitle:
        string;

      detail:
        string;

      evidenceCount:
        number;

      evidenceRefs:
        readonly string[];

      related:
        readonly string[];
    }
  | null;

function short(
  value:
    string
) {
  if (
    value.length <=
    22
  ) {
    return value;
  }

  return (
    `${value.slice(
      0,
      8
    )}` +
    `...` +
    `${value.slice(
      -6
    )}`
  );
}

function compact(
  value:
    string,
  max =
    30
) {
  return value.length >
    max
    ? `${value.slice(
        0,
        max - 1
      )}…`
    : value;
}

function nodeKindLabel(
  node:
    VisualEvidenceNode
) {
  switch (
    node.kind
  ) {
    case "root_wallet":
      return "ANALYZED WALLET";

    case "root_token":
      return "ANALYZED TOKEN";

    case "wallet":
      return "WALLET";

    case "funding_source":
      return "FUNDING SOURCE";

    case "transaction":
      return "TRANSACTION";

    case "evidence":
      return "EVIDENCE";
  }
}

function edgeKindLabel(
  edge:
    VisualEvidenceEdge
) {
  switch (
    edge.kind
  ) {
    case "transaction":
      return "TRANSACTION";

    case "token_transfer":
      return "TOKEN TRANSFER";

    case "funding":
      return "FUNDING";

    case "holder_position":
      return "HOLDER";

    case "direct_interaction":
      return "DIRECT";

    case "transaction_cooccurrence":
      return "CO-OCCURRENCE";

    case "address_history":
      return "HISTORY";

    case "canonical_evidence":
      return "CANONICAL";
  }
}

function unique(
  values:
    readonly string[]
) {
  return Array.from(
    new Set(
      values.filter(
        Boolean
      )
    )
  );
}

function buildPositions(
  graph:
    VisualEvidenceGraphData
) {
  const result =
    new Map<
      string,
      Point
    >();

  const root =
    graph.nodes.find(
      node =>
        node.kind ===
          "root_wallet" ||
        node.kind ===
          "root_token"
    ) ??
    graph.nodes[0];

  if (!root) {
    return result;
  }

  const rootPoint = {
    x:
      WIDTH *
      0.48,

    y:
      HEIGHT /
      2,
  };

  result.set(
    root.id,
    rootPoint
  );

  const incomingIds:
    string[] = [];

  const outgoingIds:
    string[] = [];

  for (
    const edge of
    graph.edges
  ) {
    if (
      edge.target ===
        root.id &&
      edge.source !==
        root.id &&
      !incomingIds.includes(
        edge.source
      )
    ) {
      incomingIds.push(
        edge.source
      );
    }

    if (
      edge.source ===
        root.id &&
      edge.target !==
        root.id &&
      !outgoingIds.includes(
        edge.target
      )
    ) {
      outgoingIds.push(
        edge.target
      );
    }
  }

  const used =
    new Set<string>([
      root.id,
    ]);

  function placeColumn(
    ids:
      readonly string[],
    x:
      number
  ) {
    const available =
      ids.filter(
        id =>
          !used.has(
            id
          )
      );

    available.forEach(
      (
        id,
        index
      ) => {
        const step =
          HEIGHT /
          (
            available.length +
            1
          );

        result.set(
          id,
          {
            x,

            y:
              step *
              (
                index +
                1
              ),
          }
        );

        used.add(
          id
        );
      }
    );
  }

  placeColumn(
    incomingIds,
    125
  );

  placeColumn(
    outgoingIds,
    WIDTH -
      125
  );

  const remaining =
    graph.nodes.filter(
      node =>
        !used.has(
          node.id
        )
    );

  remaining.forEach(
    (
      node,
      index
    ) => {
      const angle =
        -Math.PI /
          2 +
        (
          index *
          Math.PI *
          2
        ) /
          Math.max(
            remaining.length,
            1
          );

      result.set(
        node.id,
        {
          x:
            rootPoint.x +
            Math.cos(
              angle
            ) *
              210,

          y:
            rootPoint.y +
            Math.sin(
              angle
            ) *
              130,
        }
      );
    }
  );

  return result;
}

function nodeSelection(
  graph:
    VisualEvidenceGraphData,
  node:
    VisualEvidenceNode
): InteractiveEvidenceSelection {
  const connected =
    graph.edges.filter(
      edge =>
        edge.source ===
          node.id ||
        edge.target ===
          node.id
    );

  const refs =
    unique(
      connected.flatMap(
        edge =>
          edge.evidenceRefs
      )
    );

  const related =
    unique(
      connected.map(
        edge => {
          const otherId =
            edge.source ===
              node.id
              ? edge.target
              : edge.source;

          return (
            graph.nodes.find(
              item =>
                item.id ===
                otherId
            )?.label ??
            otherId
          );
        }
      )
    );

  return {
    type:
      "node",

    id:
      node.id,

    title:
      node.label,

    subtitle:
      nodeKindLabel(
        node
      ),

    detail:
      node.detail,

    evidenceCount:
      connected.reduce(
        (
          total,
          edge
        ) =>
          total +
          edge.evidenceCount,
        0
      ),

    evidenceRefs:
      refs,

    related,
  };
}

function edgeSelection(
  graph:
    VisualEvidenceGraphData,
  edge:
    VisualEvidenceEdge
): InteractiveEvidenceSelection {
  const source =
    graph.nodes.find(
      node =>
        node.id ===
        edge.source
    );

  const target =
    graph.nodes.find(
      node =>
        node.id ===
        edge.target
    );

  return {
    type:
      "edge",

    id:
      edge.id,

    title:
      edge.label,

    subtitle:
      edgeKindLabel(
        edge
      ),

    detail:
      `${
        source?.label ??
        edge.source
      } → ${
        target?.label ??
        edge.target
      }`,

    evidenceCount:
      edge.evidenceCount,

    evidenceRefs:
      edge.evidenceRefs,

    related:
      [
        source?.label ??
          edge.source,

        target?.label ??
          edge.target,
      ],
  };
}

function emitSelection(
  selection:
    InteractiveEvidenceSelection
) {
  window.dispatchEvent(
    new CustomEvent(
      "ayzo:evidence-selection",
      {
        detail: {
          evidenceRefs:
            selection
              ?.evidenceRefs ??
            [],
        },
      }
    )
  );
}

export default function InteractiveEvidenceGraph({
  graph,
  subject,
  selection,
  onSelectionChange,
}: {
  graph:
    VisualEvidenceGraphData;

  subject:
    string;

  selection:
    InteractiveEvidenceSelection;

  onSelectionChange:
    (
      selection:
        InteractiveEvidenceSelection
    ) => void;
}) {
  const positions =
    buildPositions(
      graph
    );

  function choose(
    next:
      InteractiveEvidenceSelection
  ) {
    onSelectionChange(
      next
    );

    emitSelection(
      next
    );
  }

  function selectNode(
    node:
      VisualEvidenceNode
  ) {
    choose(
      nodeSelection(
        graph,
        node
      )
    );
  }

  function selectEdge(
    edge:
      VisualEvidenceEdge
  ) {
    choose(
      edgeSelection(
        graph,
        edge
      )
    );
  }

  return (
    <section
      id="visual-evidence-graph"
      className={`${styles.card} ${styles.panel} scroll-mt-24`}
    >
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.briefTitle}>
            Wallet relationship map
          </h3>

          <p>
            Select a node or connection to inspect
            its observed evidence path.
          </p>
        </div>

        <div className={styles.legend}>
          <span>
            <i className={styles.legendLine} />
            Observed path
          </span>

          <span>
            <i
              className={`${styles.legendLine} ${styles.legendSwap}`}
            />
            Alternate evidence
          </span>
        </div>
      </div>

      {graph.status ===
      "unavailable" ? (
        <div className={styles.networkCanvas}>
          <div
            className={`${styles.graphNode} ${styles.graphNodeRoot} ${styles.graphNodeCentered}`}
          >
            <span>
              {short(
                subject
              )}
            </span>

            <small>
              ANALYZED SUBJECT
            </small>

            <small className={styles.graphUnavailableNote}>
              No supported relationship edges were collected in this evidence window.
            </small>
          </div>
        </div>
      ) : (
        <div className={styles.networkCanvas}>
          <svg
            className={styles.networkSvg}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Interactive AYZO visual evidence graph"
          >
            <defs>
              <marker
                id="ayzo-curve-arrow"
                markerWidth="7"
                markerHeight="7"
                refX="5.5"
                refY="3.5"
                orient="auto"
              >
                <path
                  d="M0 0 L6 3.5 L0 7 Z"
                  fill="#61829a"
                />
              </marker>

              <marker
                id="ayzo-curve-arrow-active"
                markerWidth="7"
                markerHeight="7"
                refX="5.5"
                refY="3.5"
                orient="auto"
              >
                <path
                  d="M0 0 L6 3.5 L0 7 Z"
                  fill="#63ddf1"
                />
              </marker>

              <marker
                id="ayzo-curve-arrow-observed"
                markerWidth="7"
                markerHeight="7"
                refX="5.5"
                refY="3.5"
                orient="auto"
              >
                <path
                  d="M0 0 L6 3.5 L0 7 Z"
                  fill="#ac96fb"
                />
              </marker>
            </defs>

            {graph.edges.map(
              edge => {
                const source =
                  positions.get(
                    edge.source
                  );

                const target =
                  positions.get(
                    edge.target
                  );

                if (
                  !source ||
                  !target
                ) {
                  return null;
                }

                const active =
                  selection
                    ?.type ===
                    "edge"
                    ? selection.id ===
                      edge.id
                    : selection
                          ?.type ===
                        "node"
                      ? edge.source ===
                          selection.id ||
                        edge.target ===
                          selection.id
                      : false;

                const observed =
                  edge.direction ===
                  "observed";

                const dx =
                  target.x -
                  source.x;

                const dy =
                  target.y -
                  source.y;

                const path =
                  `M ${source.x} ${source.y} ` +
                  `C ${source.x + dx * .47} ${source.y + dy * .04}, ` +
                  `${target.x - dx * .47} ${target.y - dy * .04}, ` +
                  `${target.x} ${target.y}`;

                return (
                  <path
                    key={
                      edge.id
                    }
                    d={
                      path
                    }
                    role="button"
                    tabIndex={
                      0
                    }
                    aria-label={`Inspect ${edgeKindLabel(
                      edge
                    )}: ${edge.label}`}
                    className={`${styles.graphEdge} ${
                      observed
                        ? styles.graphEdgeObserved
                        : ""
                    } ${
                      active
                        ? styles.graphEdgeSelected
                        : ""
                    }`}
                    markerEnd={
                      active
                        ? "url(#ayzo-curve-arrow-active)"
                        : observed
                          ? "url(#ayzo-curve-arrow-observed)"
                          : "url(#ayzo-curve-arrow)"
                    }
                    onClick={() =>
                      selectEdge(
                        edge
                      )
                    }
                    onKeyDown={
                      event => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key ===
                            " "
                        ) {
                          event.preventDefault();

                          selectEdge(
                            edge
                          );
                        }
                      }
                    }
                  />
                );
              }
            )}
          </svg>

          {graph.nodes.map(
            node => {
              const point =
                positions.get(
                  node.id
                );

              if (!point) {
                return null;
              }

              const active =
                selection
                  ?.type ===
                  "node"
                  ? selection.id ===
                    node.id
                  : selection
                        ?.type ===
                      "edge"
                    ? graph.edges.some(
                        edge =>
                          edge.id ===
                            selection.id &&
                          (
                            edge.source ===
                              node.id ||
                            edge.target ===
                              node.id
                          )
                      )
                    : false;

              const kindClass =
                node.kind ===
                    "root_wallet" ||
                node.kind ===
                    "root_token"
                  ? styles.graphNodeRoot
                  : node.kind ===
                      "funding_source"
                    ? styles.graphNodeFunding
                    : node.kind ===
                        "transaction"
                      ? styles.graphNodeTransaction
                      : node.kind ===
                          "evidence"
                        ? styles.graphNodeEvidence
                        : "";

              return (
                <button
                  key={
                    node.id
                  }
                  type="button"
                  aria-pressed={
                    active
                  }
                  aria-label={`Inspect ${node.label}`}
                  onClick={() =>
                    selectNode(
                      node
                    )
                  }
                  className={`${styles.graphNode} ${kindClass} ${
                    active
                      ? styles.graphNodeSelected
                      : ""
                  }`}
                  style={{
                    left:
                      `${
                        point.x /
                        WIDTH *
                        100
                      }%`,

                    top:
                      `${
                        point.y /
                        HEIGHT *
                        100
                      }%`,
                  }}
                >
                  <span>
                    {
                      short(
                        node.label
                      )
                    }
                  </span>

                  <small>
                    {
                      compact(
                        node.detail ??
                        nodeKindLabel(
                          node
                        ),
                        32
                      )
                    }
                  </small>
                </button>
              );
            }
          )}
        </div>
      )}

      <div className={styles.networkFoot}>
        <span>
          {
            graph.limitation ??
            "Arrow direction represents observed evidence direction."
          }
        </span>

        <strong>
          Connection ≠ common ownership
        </strong>
      </div>
    </section>
  );
}
