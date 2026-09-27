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
};

type SynthesisPreview = {
  evidenceTransactions:
    string;

  fundingPaths:
    string;

  graphDepth:
    string;

  coordinationSignals:
    string;
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
        <div className="rounded-xl border border-[#26384f] bg-[#0d1c2f] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                Coverage
              </div>

              <div className="mt-1 text-lg font-semibold text-zinc-100">
                {coverage}
              </div>
            </div>

            <span
              className={`rounded-full border px-2 py-1 text-[8px] font-medium ${coverageClass(
                coverageTone
              )}`}
            >
              {coverageTone.toUpperCase()}
            </span>
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Current bounded evidence scope
          </p>
        </div>

        <div className="rounded-xl border border-[#26384f] bg-[#0d1c2f] p-4">
          <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
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

        <div className="rounded-xl border border-[#26384f] bg-[#0d1c2f] p-4">
          <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
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

        <div className="rounded-xl border border-[#26384f] bg-[#0d1c2f] p-4">
          <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
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
        <div className="mb-3 text-[10px] font-semibold text-zinc-200">
          Evidence modules
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {cards.map(
            card => (
              <div
                key={
                  card.title
                }
                className="flex items-center justify-between gap-4 rounded-xl border border-[#26384f] bg-[#0d1c2f] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">
                    {
                      card.title
                    }
                  </div>

                  <div className="mt-1 text-[10px] text-zinc-600">
                    {
                      card.detail
                    }
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
        <div className="border-t border-violet-500/15 bg-violet-500/[0.035] px-4 py-4 sm:px-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.15em] text-violet-300">
                ADVANCED INVESTIGATION SYNTHESIS
              </div>

              <div className="mt-1 text-[10px] text-zinc-600">
                Existing synthesis evidence summarized without adding
                inference.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                [
                  "Evidence TX",
                  synthesis.evidenceTransactions,
                ],
                [
                  "Funding paths",
                  synthesis.fundingPaths,
                ],
                [
                  "Graph depth",
                  synthesis.graphDepth,
                ],
                [
                  "Coordination",
                  synthesis.coordinationSignals,
                ],
              ].map(
                item => (
                  <div
                    key={
                      item[0]
                    }
                  >
                    <div className="text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                      {
                        item[0]
                      }
                    </div>

                    <div className="mt-0.5 text-xs font-semibold text-violet-200">
                      {
                        item[1]
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
