import type {
  VisualEvidenceEdge,
  VisualEvidenceGraph as VisualEvidenceGraphData,
  VisualEvidenceNode,
} from "@/lib/intelligence/visualEvidenceGraph";

const WIDTH = 760;
const HEIGHT = 430;

type Point = {
  x: number;
  y: number;
};

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
    28
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

function nodeRectClass(
  node:
    VisualEvidenceNode
) {
  switch (
    node.kind
  ) {
    case "root_wallet":
    case "root_token":
      return "fill-zinc-950 stroke-violet-400";

    case "funding_source":
      return "fill-zinc-950 stroke-emerald-500";

    case "transaction":
      return "fill-zinc-950 stroke-blue-500";

    case "evidence":
      return "fill-zinc-950 stroke-zinc-600";

    case "wallet":
      return "fill-zinc-950 stroke-zinc-700";
  }
}

function buildPositions(
  nodes:
    readonly VisualEvidenceNode[]
) {
  const result =
    new Map<
      string,
      Point
    >();

  const root =
    nodes.find(
      node =>
        node.kind ===
          "root_wallet" ||
        node.kind ===
          "root_token"
    ) ??
    nodes[0];

  if (!root) {
    return result;
  }

  const center = {
    x:
      WIDTH / 2,
    y:
      HEIGHT / 2,
  };

  result.set(
    root.id,
    center
  );

  const others =
    nodes.filter(
      node =>
        node.id !==
        root.id
    );

  if (
    others.length ===
    0
  ) {
    return result;
  }

  for (
    let index = 0;
    index <
    others.length;
    index += 1
  ) {
    const angle =
      -Math.PI / 2 +
      (
        index *
        Math.PI *
        2
      ) /
        others.length;

    result.set(
      others[index].id,
      {
        x:
          center.x +
          Math.cos(
            angle
          ) *
            255,

        y:
          center.y +
          Math.sin(
            angle
          ) *
            145,
      }
    );
  }

  return result;
}

function statusLabel(
  status:
    VisualEvidenceGraphData["status"]
) {
  switch (
    status
  ) {
    case "complete":
      return "SUPPORTED";

    case "limited":
      return "BOUNDED";

    case "unavailable":
      return "UNAVAILABLE";
  }
}

export default function VisualEvidenceGraph({
  graph,
}: {
  graph:
    VisualEvidenceGraphData;
}) {
  const positions =
    buildPositions(
      graph.nodes
    );

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-zinc-950/70">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 p-5 sm:p-6">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            VISUAL EVIDENCE GRAPH
          </div>

          <h3 className="mt-2 text-lg font-semibold text-zinc-100">
            Evidence-backed relationship map
          </h3>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            Only relationships supported by evidence already collected by AYZO are shown.
          </p>
        </div>

        <div className="text-right">
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] text-violet-300">
            {statusLabel(
              graph.status
            )}
          </span>

          <div className="mt-2 text-[10px] text-zinc-700">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </div>
        </div>
      </div>

      {graph.status ===
        "unavailable" ? (
        <div className="p-6 text-xs leading-5 text-zinc-600">
          Visual evidence graph is unavailable for the current bounded evidence.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border-b border-zinc-900">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="min-w-[720px]"
              role="img"
              aria-label="AYZO visual evidence graph"
            >
              <defs>
                <marker
                  id="ayzo-evidence-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    className="fill-zinc-600"
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
                        className="stroke-zinc-700"
                        strokeWidth="1.5"
                        strokeDasharray={
                          edge.direction ===
                          "observed"
                            ? "5 6"
                            : undefined
                        }
                        markerEnd={
                          edge.direction ===
                          "forward" ||
                          edge.direction ===
                          "bidirectional"
                            ? "url(#ayzo-evidence-arrow)"
                            : undefined
                        }
                        markerStart={
                          edge.direction ===
                          "bidirectional"
                            ? "url(#ayzo-evidence-arrow)"
                            : undefined
                        }
                      />

                      <text
                        x={
                          midpointX
                        }
                        y={
                          midpointY -
                          7
                        }
                        textAnchor="middle"
                        className="fill-zinc-600 text-[9px]"
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

                  return (
                    <g
                      key={
                        node.id
                      }
                      transform={`translate(${point.x}, ${point.y})`}
                    >
                      <rect
                        x="-78"
                        y="-30"
                        width="156"
                        height="60"
                        rx="14"
                        className={`${nodeRectClass(
                          node
                        )} stroke-[1.5]`}
                      />

                      <text
                        x="0"
                        y="-11"
                        textAnchor="middle"
                        className="fill-zinc-600 text-[8px] font-medium"
                      >
                        {nodeKindLabel(
                          node
                        )}
                      </text>

                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        className="fill-zinc-200 text-[10px] font-medium"
                      >
                        {short(
                          node.label
                        )}
                      </text>

                      {node.detail && (
                        <text
                          x="0"
                          y="19"
                          textAnchor="middle"
                          className="fill-zinc-600 text-[8px]"
                        >
                          {compact(
                            node.detail,
                            27
                          )}
                        </text>
                      )}
                    </g>
                  );
                }
              )}
            </svg>
          </div>

          {graph.edges.length >
            0 && (
            <div className="p-5 sm:p-6">
              <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-600">
                EVIDENCE EDGES
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {graph.edges
                  .slice(
                    0,
                    8
                  )
                  .map(
                    edge => (
                      <div
                        key={
                          edge.id
                        }
                        className="rounded-xl border border-zinc-900 bg-black/20 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-medium text-zinc-400">
                            {edgeKindLabel(
                              edge
                            )}
                          </span>

                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[8px] font-medium text-emerald-300">
                            SUPPORTED
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-zinc-500">
                          {edge.label}
                        </div>

                        <div className="mt-2 text-[9px] text-zinc-700">
                          Evidence count:{" "}
                          {
                            edge.evidenceCount
                          }
                          {edge
                            .evidenceRefs
                            .length >
                            0 &&
                            ` · ${edge.evidenceRefs.length} transaction reference(s)`}
                        </div>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-900 px-5 py-4 text-[10px] leading-5 text-zinc-700 sm:px-6">
            {graph.limitation}
          </div>

          <div className="border-t border-zinc-900 px-5 py-3 text-[9px] text-zinc-800 sm:px-6">
            Ownership inference: OFF · Max {graph.coverage.maxNodes} nodes · Max {graph.coverage.maxEdges} edges
          </div>
        </>
      )}
    </section>
  );
}
