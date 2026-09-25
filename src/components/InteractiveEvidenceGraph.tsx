"use client";

import type {
  VisualEvidenceEdge,
  VisualEvidenceGraph as VisualEvidenceGraphData,
  VisualEvidenceNode,
} from "@/lib/intelligence/visualEvidenceGraph";

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

function nodeClass(
  node:
    VisualEvidenceNode,
  active:
    boolean
) {
  if (active) {
    return (
      "fill-[#16506a] " +
      "stroke-cyan-300"
    );
  }

  switch (
    node.kind
  ) {
    case "root_wallet":
    case "root_token":
      return (
        "fill-[#153e58] " +
        "stroke-cyan-400"
      );

    case "funding_source":
      return (
        "fill-[#173a36] " +
        "stroke-emerald-500"
      );

    case "transaction":
      return (
        "fill-[#183553] " +
        "stroke-blue-400"
      );

    case "evidence":
      return (
        "fill-[#182235] " +
        "stroke-zinc-600"
      );

    case "wallet":
      return (
        "fill-[#1a3049] " +
        "stroke-[#536d89]"
      );
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
      className="scroll-mt-24 overflow-hidden rounded-[14px] border border-[#26384f] bg-gradient-to-br from-[#13243a] to-[#101d30] p-[18px]"
    >
      <div className="mb-[15px] flex flex-wrap items-start justify-between gap-[10px]">
        <div>
          <h3 className="m-0 text-[18px] font-semibold leading-[1.25] tracking-[-0.015em] text-[#edf5ff]">
            Wallet relationship map
          </h3>

          <p className="mt-[3px] max-w-2xl text-[12px] leading-5 text-[#94a8bf]">
            Select a node or connection to inspect its observed evidence path.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[13px] text-[11px] text-[#bac9dc]">
          <span className="inline-flex items-center gap-[5px]">
            <i className="inline-block w-[17px] border-t-[3px] border-cyan-300" />
            Observed path
          </span>

          <span className="inline-flex items-center gap-[5px]">
            <i className="inline-block w-[17px] border-t-[3px] border-dashed border-violet-300" />
            Selected / alternate evidence
          </span>
        </div>
      </div>

      {graph.status ===
      "unavailable" ? (
        <div className="relative min-h-[380px] overflow-hidden rounded-[11px] border border-[#293d57] bg-[radial-gradient(ellipse_at_47%_51%,#1c3551_0%,#101d30_59%)]">
          <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#a1c8e8_0.8px,transparent_0.8px)] [background-size:19px_19px]" />

          <div className="absolute left-1/2 top-1/2 z-10 min-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-[13px] border border-cyan-400 bg-[#153e58] px-5 py-4 text-center shadow-[0_0_0_4px_rgba(99,221,241,.08)]">
            <div className="text-[9px] font-semibold tracking-[0.12em] text-cyan-300">
              ANALYZED SUBJECT
            </div>

            <div className="mt-2 font-mono text-xs font-semibold text-zinc-100">
              {short(subject)}
            </div>

            <div className="mt-2 text-[10px] leading-4 text-zinc-400">
              No supported relationship edges were collected in this evidence window.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[11px] border border-[#293d57] bg-[radial-gradient(ellipse_at_47%_51%,#1c3551_0%,#101d30_59%)]">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-[380px] w-full min-w-[760px]"
              role="img"
              aria-label="Interactive AYZO visual evidence graph"
            >
              <defs>
                <marker
                  id="ayzo-arrow-dim"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    fill="#52677d"
                  />
                </marker>

                <marker
                  id="ayzo-arrow-active"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    fill="#63ddf1"
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

                  const midpointX =
                    (
                      source.x +
                      target.x
                    ) /
                    2;

                  const midpointY =
                    (
                      source.y +
                      target.y
                    ) /
                    2;

                  return (
                    <g
                      key={
                        edge.id
                      }
                      role="button"
                      tabIndex={
                        0
                      }
                      aria-label={`Inspect ${edge.label}`}
                      className="cursor-pointer outline-none"
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
                    >
                      <line
                        x1={
                          source.x
                        }
                        y1={
                          source.y
                        }
                        x2={
                          target.x
                        }
                        y2={
                          target.y
                        }
                        stroke={
                          active
                            ? "#63ddf1"
                            : "#52677d"
                        }
                        strokeWidth={
                          active
                            ? 3.5
                            : 2
                        }
                        opacity={
                          selection &&
                          !active
                            ? 0.28
                            : 0.8
                        }
                        strokeDasharray={
                          edge.direction ===
                          "observed"
                            ? "6 6"
                            : undefined
                        }
                        markerEnd={
                          edge.direction ===
                            "forward" ||
                          edge.direction ===
                            "bidirectional"
                            ? active
                              ? "url(#ayzo-arrow-active)"
                              : "url(#ayzo-arrow-dim)"
                            : undefined
                        }
                        markerStart={
                          edge.direction ===
                          "bidirectional"
                            ? active
                              ? "url(#ayzo-arrow-active)"
                              : "url(#ayzo-arrow-dim)"
                            : undefined
                        }
                      />

                      <text
                        x={
                          midpointX
                        }
                        y={
                          midpointY -
                          8
                        }
                        textAnchor="middle"
                        className={
                          active
                            ? "fill-cyan-300 text-[9px] font-medium"
                            : "fill-zinc-600 text-[9px]"
                        }
                      >
                        {compact(
                          edgeKindLabel(
                            edge
                          ),
                          18
                        )}
                      </text>
                    </g>
                  );
                }
              )}

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

                  return (
                    <g
                      key={
                        node.id
                      }
                      transform={`translate(${point.x}, ${point.y})`}
                      role="button"
                      tabIndex={
                        0
                      }
                      aria-label={`Inspect ${node.label}`}
                      className="cursor-pointer outline-none"
                      onClick={() =>
                        selectNode(
                          node
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

                            selectNode(
                              node
                            );
                          }
                        }
                      }
                    >
                      <rect
                        x="-78"
                        y="-31"
                        width="156"
                        height="62"
                        rx="14"
                        className={`${nodeClass(
                          node,
                          active
                        )} stroke-[1.8] transition`}
                      />

                      <text
                        x="0"
                        y="-11"
                        textAnchor="middle"
                        className={
                          active
                            ? "fill-cyan-200 text-[8px] font-semibold"
                            : "fill-zinc-500 text-[8px] font-medium"
                        }
                      >
                        {
                          nodeKindLabel(
                            node
                          )
                        }
                      </text>

                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        className="fill-zinc-100 text-[10px] font-semibold"
                      >
                        {
                          short(
                            node.label
                          )
                        }
                      </text>

                      {node.detail && (
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          className="fill-zinc-500 text-[8px]"
                        >
                          {
                            compact(
                              node.detail,
                              27
                            )
                          }
                        </text>
                      )}
                    </g>
                  );
                }
              )}
            </svg>
          </div>

        </>
      )}

      <div className="mt-[11px] flex flex-wrap justify-between gap-[10px] text-[11px] text-[#94a8bf]">
        <span>
          {
            graph.limitation ??
            "Arrow direction represents observed evidence direction."
          }
        </span>

        <strong className="font-semibold text-[#bac9dc]">
          Connection ≠ common ownership
        </strong>
      </div>
    </section>
  );
}
