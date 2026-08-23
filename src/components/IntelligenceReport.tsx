"use client";

import { useEffect, useState } from "react";

type Holder = {
  rank: number;
  owner: string;
  percentage: number;
};

type Relation = {
  walletA: string;
  walletB: string;
  sharedTransactionCount: number;
  directSolTransferCount: number;
  directSol: number;
  confidence: "low" | "medium" | "high";
};

type Finding = {
  id: string;
  category: string;
  title: string;
  severity: "attention" | "informational";
  confidence: "low" | "medium" | "high";
  summary: string;
  caveat: string;
};

type FundingWallet = {
  wallet: string;
  recentIncomingTransfers: {
    source: string;
    sol: number;
    signature: string;
  }[];
};

type IntelligenceData = {
  ok: true;
  coverage?: "full" | "limited" | "partial";
  holders: {
    coverage?: "full" | "limited";
    limitation?: {
      code: string;
      message: string;
      methodology: string;
    };
    concentration: {
      top1: number | null;
      top5: number | null;
      top10: number | null;
      top20: number | null;
    };
    tokenAccountsAnalyzed: number;
    uniqueOwners: number;
    owners: Holder[];
  };
  relationships: {
    ok: true;
    walletsAnalyzed: number;
    sharedTransactionsDetected: number;
    relationshipsDetected: number;
    relations: Relation[];
  } | null;
  findings: Finding[];
  funding: {
    ok: true;
    walletsAnalyzed: number;
    incomingTransfersDetected: number;
    sharedFundingSourcesDetected: number;
    perWallet: FundingWallet[];
  } | null;
};

function short(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function pct(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return `${value.toFixed(2)}%`;
}

export default function IntelligenceReport({
  address,
}: {
  address: string;
}) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/solana/intelligence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address }),
        });

        const result = await response.json();

        if (cancelled) return;

        if (!result.ok) {
          throw new Error(
            result.details || result.error || "Intelligence analysis failed."
          );
        }

        setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "AYZO Intelligence unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    setElapsedSeconds(0);

    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loading, address]);

  if (loading) {
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-zinc-950/70">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
                AYZO INTELLIGENCE
              </div>

              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                Analyzing on-chain evidence
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                AYZO is examining the most relevant wallet and token
                signals. This normally takes a few seconds.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">
              {elapsedSeconds}s elapsed
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-emerald-400">✓</span>
                <span className="text-sm text-zinc-300">
                  Token verification
                </span>
              </div>

              <span className="text-[10px] font-medium tracking-wide text-emerald-400">
                VERIFIED
              </span>
            </div>

            {[
              ["Holder distribution", "Ownership concentration"],
              ["Wallet relationships", "Direct interactions & co-occurrence"],
              ["Funding signals", "Recent incoming SOL activity"],
              ["Evidence summary", "Most important findings"],
            ].map(([title, subtitle]) => (
              <div
                key={title}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
                  </span>

                  <div>
                    <div className="text-sm text-zinc-300">
                      {title}
                    </div>

                    <div className="mt-0.5 text-[10px] text-zinc-600">
                      {subtitle}
                    </div>
                  </div>
                </div>

                <span className="text-[9px] tracking-[0.12em] text-zinc-600">
                  ANALYZING
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 h-1 overflow-hidden rounded-full bg-zinc-900">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
          </div>

          <p className="mt-4 text-[10px] leading-5 text-zinc-700">
            Analysis time can vary with network and RPC conditions.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8">
        <div className="text-sm font-medium text-amber-300">
          Intelligence analysis unavailable
        </div>
        <div className="mt-2 text-xs text-zinc-500">{error}</div>
      </div>
    );
  }

  const limitedCoverage =
    data.coverage === "limited" ||
    data.holders.coverage === "limited";

  if (limitedCoverage) {
    const finding = data.findings?.[0];

    return (
      <div className="mt-6 space-y-4">
        <section className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-zinc-950/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
                AYZO ANALYSIS
              </div>

              <h3 className="mt-2 text-2xl font-semibold text-zinc-100">
                Partial Coverage
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                AYZO verified the token, but reliable holder ranking is
                unavailable under the current data-provider limits.
              </p>
            </div>

            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-amber-300">
              LIMITED COVERAGE
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-5">
            <div className="text-[10px] font-medium tracking-[0.15em] text-zinc-500">
              HOLDER INTELLIGENCE
            </div>

            <h4 className="mt-3 text-base font-medium text-zinc-100">
              {finding?.title ??
                "Holder intelligence coverage is limited"}
            </h4>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {finding?.summary ??
                data.holders.limitation?.message ??
                "Reliable top-holder ranking is unavailable."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                HOLDER RANKING
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-300">
                Unavailable
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                RELATIONSHIPS
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-300">
                Not run
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[10px] text-zinc-600">
                FUNDING
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-300">
                Not run
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-900 pt-5">
            <p className="text-xs leading-5 text-zinc-600">
              AYZO does not estimate holder concentration from unsorted
              account samples. Deeper wallet analysis is intentionally
              skipped when a reliable top-holder set cannot be established.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const relationshipUnavailable =
    data.relationships === null;

  const fundingUnavailable =
    data.funding === null;

  const directRelations =
    data.relationships?.relations.filter(
      (item) => item.directSolTransferCount > 0
    ) ?? [];

  return (
    <div className="mt-6 space-y-6">
      <details className="group rounded-3xl border border-zinc-800 bg-zinc-950/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 sm:p-7">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
              DETAILED EVIDENCE
            </div>

            <h3 className="mt-2 text-lg font-semibold">
              Holder Intelligence
            </h3>

            <p className="mt-1 text-xs text-zinc-600">
              Ownership concentration and major holders
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-600">
                TOP 20
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-200">
                {pct(data.holders.concentration.top20)}
              </div>
            </div>

            <span className="text-xl text-zinc-600 transition-transform group-open:rotate-90">
              ›
            </span>
          </div>
        </summary>

        <div className="border-t border-zinc-900 px-6 pb-6 pt-5 sm:px-7">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Top 1" value={pct(data.holders.concentration.top1)} />
            <Stat label="Top 5" value={pct(data.holders.concentration.top5)} />
            <Stat label="Top 10" value={pct(data.holders.concentration.top10)} />
            <Stat label="Top 20" value={pct(data.holders.concentration.top20)} />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-900">
            {data.holders.owners.slice(0, 5).map((holder) => (
              <div
                key={holder.owner}
                className="flex items-center justify-between border-b border-zinc-900 px-5 py-4 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-700">
                    {holder.rank}
                  </span>

                  <span className="font-mono text-xs text-zinc-400">
                    {short(holder.owner)}
                  </span>
                </div>

                <span className="text-sm font-medium">
                  {pct(holder.percentage)}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-600">
            Concentration alone is not treated as a risk signal.
            Entity classification will provide additional context.
          </p>
        </div>
      </details>

      <details className="group rounded-3xl border border-zinc-800 bg-zinc-950/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 sm:p-7">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
              DETAILED EVIDENCE
            </div>

            <h3 className="mt-2 text-lg font-semibold">
              Relationship Intelligence
            </h3>

            <p className="mt-1 text-xs text-zinc-600">
              Direct interactions and transaction co-occurrence
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-600">
                {relationshipUnavailable ? "STATUS" : "DIRECT"}
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-200">
                {relationshipUnavailable
                  ? "Unavailable"
                  : directRelations.length}
              </div>
            </div>

            <span className="text-xl text-zinc-600 transition-transform group-open:rotate-90">
              ›
            </span>
          </div>
        </summary>

        <div className="border-t border-zinc-900 px-6 pb-6 pt-5 sm:px-7">
          {relationshipUnavailable ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="text-sm font-medium text-amber-300">
                Relationship analysis temporarily unavailable
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                AYZO did not generate a relationship conclusion from
                an incomplete analysis. You can retry the analysis later.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  label="Wallets analyzed"
                  value={String(data.relationships?.walletsAnalyzed ?? 0)}
                />
                <Stat
                  label="Relationships"
                  value={String(data.relationships?.relationshipsDetected ?? 0)}
                />
                <Stat
                  label="Shared transactions"
                  value={String(
                    data.relationships?.sharedTransactionsDetected ?? 0
                  )}
                />
                <Stat
                  label="Direct interactions"
                  value={String(directRelations.length)}
                />
              </div>

              <div className="mt-5 space-y-3">
                {data.relationships?.relations.map((relation, index) => (
                  <div
                    key={`${relation.walletA}-${relation.walletB}`}
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] tracking-wide text-zinc-600">
                          RELATIONSHIP {index + 1}
                        </div>

                        <div className="mt-2 font-mono text-xs text-zinc-300">
                          {short(relation.walletA)} ↔ {short(relation.walletB)}
                        </div>
                      </div>

                      {relation.directSolTransferCount > 0 && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-medium text-amber-300">
                          DIRECT INTERACTION
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MiniStat
                        label="Shared transactions"
                        value={String(relation.sharedTransactionCount)}
                      />
                      <MiniStat
                        label="Direct transfers"
                        value={String(relation.directSolTransferCount)}
                      />
                      <MiniStat
                        label="Total SOL"
                        value={relation.directSol.toLocaleString("en-US")}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-zinc-600">
                Direct interaction and transaction co-occurrence are
                evidence of on-chain activity, not proof of common ownership.
              </p>
            </>
          )}
        </div>
      </details>

      <details className="group rounded-3xl border border-zinc-800 bg-zinc-950/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 sm:p-7">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
              DETAILED EVIDENCE
            </div>

            <h3 className="mt-2 text-lg font-semibold">
              Funding Intelligence
            </h3>

            <p className="mt-1 text-xs text-zinc-600">
              Recent incoming SOL and shared funding sources
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-600">
                {fundingUnavailable ? "STATUS" : "SHARED"}
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-200">
                {fundingUnavailable
                  ? "Unavailable"
                  : data.funding?.sharedFundingSourcesDetected ?? 0}
              </div>
            </div>

            <span className="text-xl text-zinc-600 transition-transform group-open:rotate-90">
              ›
            </span>
          </div>
        </summary>

        <div className="border-t border-zinc-900 px-6 pb-6 pt-5 sm:px-7">
          {fundingUnavailable ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="text-sm font-medium text-amber-300">
                Funding analysis temporarily unavailable
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                AYZO did not generate a funding conclusion from an
                incomplete analysis. You can retry the analysis later.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat
                  label="Wallets analyzed"
                  value={String(data.funding?.walletsAnalyzed ?? 0)}
                />
                <Stat
                  label="Incoming transfers"
                  value={String(data.funding?.incomingTransfersDetected ?? 0)}
                />
                <Stat
                  label="Shared sources"
                  value={String(
                    data.funding?.sharedFundingSourcesDetected ?? 0
                  )}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/30 p-5">
                <div className="text-sm font-medium text-zinc-300">
                  {(data.funding?.sharedFundingSourcesDetected ?? 0) > 0
                    ? "Shared recent funding source detected"
                    : "No shared recent funding source detected"}
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Recent funding evidence does not identify the original
                  funder and does not prove common ownership.
                </p>
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-4">
      <div className="text-[11px] text-zinc-600">{label}</div>
      <div className="mt-2 text-sm font-medium text-zinc-300">{value}</div>
    </div>
  );
}
