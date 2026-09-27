import AdvancedEvidenceVisualSummary from "@/components/AdvancedEvidenceVisualSummary";

type CoverageTone =
  | "full"
  | "partial"
  | "limited";

type FindingPreview = {
  title: string;
  summary: string;
  confidence?:
    | "low"
    | "medium"
    | "high";
};

type SnapshotCard = {
  title: string;
  value: string;
  detail: string;

  icon:
    | "asset"
    | "activity"
    | "funding"
    | "graph";

  status?:
    string;
};

type SynthesisPreview = {
  sourceModules:
    string;

  evidenceTransactions:
    string;

  fundingPaths:
    string;

  graphNodes:
    string;

  graphEdges:
    string;

  graphDepth:
    string;

  coordinationSignals:
    string;

  multiHopCorroborations:
    string;

  deployments:
    string;

  fundingAvailable:
    boolean;

  graphAvailable:
    boolean;

  coordinationAvailable:
    boolean;

  deployerAvailable:
    boolean;
};

function coverageClass(
  tone:
    CoverageTone
) {
  return tone === "full"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    : "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

function confidenceClass(
  confidence:
    FindingPreview["confidence"]
) {
  if (
    confidence ===
    "high"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    confidence ===
    "medium"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function statusClass(
  status:
    string | undefined
) {
  if (
    status ===
      "VERIFIED" ||
    status ===
      "OBSERVED"
  ) {
    return "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-300";
  }

  if (
    status ===
    "ANALYZED"
  ) {
    return "border-violet-500/15 bg-violet-500/[0.07] text-violet-300";
  }

  if (
    status ===
    "UNAVAILABLE"
  ) {
    return "border-amber-500/15 bg-amber-500/[0.06] text-amber-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-500";
}

function ModuleGlyph({
  kind,
}: {
  kind:
    SnapshotCard["icon"];
}) {
  const glyph =
    kind === "asset"
      ? "◇"
      : kind ===
          "activity"
        ? "↔"
        : kind ===
            "funding"
          ? "↙"
          : "⌘";

  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/15 bg-cyan-500/[0.055] text-sm font-semibold text-cyan-300">
      {glyph}
    </span>
  );
}

function MetricGlyph({
  children,
}: {
  children:
    string;
}) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#30425b] bg-black/20 text-[10px] font-semibold text-cyan-300">
      {children}
    </span>
  );
}

export default function AnalysisEvidenceSnapshot({
  coverage,
  coverageTone,
  transactionCount,
  fundingSourceCount,
  moduleReadyCount,
  moduleTotal,
  findings,
  cards,
  synthesis = null,
}: {
  coverage:
    string;

  coverageTone:
    CoverageTone;

  transactionCount:
    number;

  fundingSourceCount:
    number | null;

  moduleReadyCount:
    number;

  moduleTotal:
    number;

  findings:
    readonly FindingPreview[];

  cards:
    readonly SnapshotCard[];

  synthesis?:
    SynthesisPreview | null;
}) {
  return (
    <section
      data-analysis-compact-snapshot
      className="overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-cyan-500/[0.045] via-[#0a1524] to-[#08111e]"
    >
      <div className="border-b border-[#26384f] px-4 py-4 sm:px-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.16em] text-cyan-300">
              COMPACT EVIDENCE VIEW
            </div>

            <h3 className="mt-1 text-sm font-semibold text-zinc-100">
              Key evidence at a glance
            </h3>

            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-500">
              Nothing removed — this is a compact presentation of the
              current bounded analysis. Open Full Evidence for every
              technical module and evidence detail.
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-1.5 text-[9px] font-medium tracking-wide text-cyan-300">
            EVIDENCE PRESERVED
          </span>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <div className="rounded-xl border border-[#26384f] bg-gradient-to-br from-[#10243a] to-[#0b192a] p-4">
          <div className="flex items-start justify-between gap-3">
            <MetricGlyph>
              ◫
            </MetricGlyph>

            <span
              className={`rounded-full border px-2 py-1 text-[8px] font-medium ${coverageClass(
                coverageTone
              )}`}
            >
              {coverageTone.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
            Coverage
          </div>

          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {coverage}
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Current bounded evidence scope
          </p>
        </div>

        <div className="rounded-xl border border-[#26384f] bg-gradient-to-br from-[#10243a] to-[#0b192a] p-4">
          <MetricGlyph>
            ↔
          </MetricGlyph>

          <div className="mt-4 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
            Transactions
          </div>

          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {transactionCount.toLocaleString(
              "en-US"
            )}
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Bounded activity records
          </p>
        </div>

        <div className="rounded-xl border border-[#26384f] bg-gradient-to-br from-[#10243a] to-[#0b192a] p-4">
          <MetricGlyph>
            ↙
          </MetricGlyph>

          <div className="mt-4 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
            Funding Sources
          </div>

          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {fundingSourceCount ===
            null
              ? "—"
              : fundingSourceCount.toLocaleString(
                  "en-US"
                )}
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Observed sources only
          </p>
        </div>

        <div className="rounded-xl border border-[#26384f] bg-gradient-to-br from-[#10243a] to-[#0b192a] p-4">
          <MetricGlyph>
            ◇
          </MetricGlyph>

          <div className="mt-4 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
            Modules
          </div>

          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {moduleReadyCount}
            <span className="text-sm font-normal text-zinc-600">
              {" "}
              / {moduleTotal}
            </span>
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Completed or analyzed
          </p>
        </div>
      </div>

      {findings.length >
      0 ? (
        <div className="border-t border-[#26384f] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold text-zinc-200">
                Top Findings
              </div>

              <div className="mt-0.5 text-[10px] text-zinc-600">
                Highest-priority findings from the existing analysis
              </div>
            </div>

            <span className="text-[9px] text-zinc-600">
              Full list in Full Evidence
            </span>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {findings
              .slice(
                0,
                3
              )
              .map(
                (
                  finding,
                  index
                ) => (
                  <div
                    key={`${finding.title}-${index}`}
                    className="rounded-xl border border-[#26384f] bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-[10px] font-semibold text-violet-300">
                          {index +
                            1}
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-medium text-zinc-200">
                            {
                              finding.title
                            }
                          </div>
                        </div>
                      </div>

                      {finding.confidence ? (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-medium uppercase ${confidenceClass(
                            finding.confidence
                          )}`}
                        >
                          {
                            finding.confidence
                          }
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-zinc-500">
                      {
                        finding.summary
                      }
                    </p>
                  </div>
                )
              )}
          </div>
        </div>
      ) : null}

      <div className="border-t border-[#26384f] px-4 py-4 sm:px-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold text-zinc-200">
              Evidence modules
            </div>

            <div className="mt-1 text-[9px] text-zinc-600">
              Existing evidence grouped for faster scanning
            </div>
          </div>

          <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
            compact view
          </span>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {cards.map(
            card => (
              <div
                key={
                  card.title
                }
                className="group flex min-h-[86px] items-center justify-between gap-4 rounded-xl border border-[#26384f] bg-gradient-to-r from-[#0d1c2f] to-[#0b1727] px-4 py-3 transition hover:border-cyan-500/20 hover:bg-cyan-500/[0.025]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ModuleGlyph
                    kind={
                      card.icon
                    }
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-medium text-zinc-200">
                        {
                          card.title
                        }
                      </div>

                      {card.status ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[7px] font-medium tracking-[0.08em] ${statusClass(
                            card.status
                          )}`}
                        >
                          {
                            card.status
                          }
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-[10px] text-zinc-600">
                      {
                        card.detail
                      }
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right text-sm font-semibold text-cyan-200">
                  {
                    card.value
                  }
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {synthesis ? (
        <div className="border-t border-violet-500/15 bg-violet-500/[0.02] p-4 sm:p-5">
          <AdvancedEvidenceVisualSummary
            sourceModules={
              synthesis.sourceModules
            }
            evidenceTransactions={
              synthesis.evidenceTransactions
            }
            fundingPaths={
              synthesis.fundingPaths
            }
            graphNodes={
              synthesis.graphNodes
            }
            graphEdges={
              synthesis.graphEdges
            }
            graphDepth={
              synthesis.graphDepth
            }
            coordinationSignals={
              synthesis.coordinationSignals
            }
            multiHopCorroborations={
              synthesis.multiHopCorroborations
            }
            deployments={
              synthesis.deployments
            }
            fundingAvailable={
              synthesis.fundingAvailable
            }
            graphAvailable={
              synthesis.graphAvailable
            }
            coordinationAvailable={
              synthesis.coordinationAvailable
            }
            deployerAvailable={
              synthesis.deployerAvailable
            }
          />
        </div>
      ) : null}
    </section>
  );
}
