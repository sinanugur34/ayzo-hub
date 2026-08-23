"use client";

import { useEffect, useState } from "react";

type Holder = {
  owner: string;
  percentage: number;
};

type HolderResponse =
  | {
      ok: true;
      owners: Holder[];
    }
  | {
      ok: false;
      error: string;
    };

type DirectTransfer = {
  signature: string;
  source: string;
  destination: string;
  lamports: string;
  blockTime: number | null;
};

type Relation = {
  walletA: string;
  walletB: string;
  sharedTransactionCount: number;
  directSolTransferCount: number;
  directSol: number;
  directTransfers: DirectTransfer[];
  confidence: "low" | "medium" | "high";
  evidence: string;
};

type RelationshipResponse =
  | {
      ok: true;
      walletsAnalyzed: number;
      sharedTransactionsDetected: number;
      relationshipsDetected: number;
      relations: Relation[];
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatSol(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function RelationshipIntelligence({
  address,
}: {
  address: string;
}) {
  const [data, setData] = useState<RelationshipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const holderResponse = await fetch("/api/solana/holders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address }),
        });

        const holders = (await holderResponse.json()) as HolderResponse;

        if (!holders.ok) {
          throw new Error(holders.error);
        }

        const addresses = holders.owners
          .slice(0, 5)
          .map((holder) => holder.owner);

        if (addresses.length < 2) {
          throw new Error("Not enough holder wallets for relationship analysis.");
        }

        const relationshipResponse = await fetch(
          "/api/solana/relationships",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ addresses }),
          }
        );

        const relationships =
          (await relationshipResponse.json()) as RelationshipResponse;

        if (cancelled) return;

        if (!relationships.ok) {
          throw new Error(
            relationships.details || relationships.error
          );
        }

        setData(relationships);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Relationship analysis unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    analyze();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const success = data && data.ok ? data : null;

  const directInteractions =
    success?.relations.filter(
      (relation) => relation.directSolTransferCount > 0
    ) ?? [];

  return (
    <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8">
      <div>
        <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
          RELATIONSHIP INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold">
          On-chain wallet relationships
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          AYZO checks recent activity between major holder wallets and
          separates direct interaction evidence from weaker co-occurrence.
        </p>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-zinc-900 bg-black/30 p-5 text-sm text-zinc-500">
          Analyzing recent wallet relationships...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-sm font-medium text-amber-300">
            Relationship analysis unavailable
          </div>
          <div className="mt-2 text-xs leading-5 text-zinc-500">
            {error}
          </div>
        </div>
      )}

      {!loading && success && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Wallets analyzed"
              value={String(success.walletsAnalyzed)}
            />
            <Stat
              label="Relationships"
              value={String(success.relationshipsDetected)}
            />
            <Stat
              label="Shared transactions"
              value={String(success.sharedTransactionsDetected)}
            />
            <Stat
              label="Direct interactions"
              value={String(directInteractions.length)}
            />
          </div>

          {success.relationshipsDetected === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-900 bg-black/30 p-5">
              <div className="text-sm font-medium text-zinc-300">
                No direct relationships detected
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                No relationship evidence was found between the five largest
                analyzed owner wallets in the current activity window.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {success.relations.map((relation, index) => {
                const hasDirectTransfer =
                  relation.directSolTransferCount > 0;

                return (
                  <div
                    key={`${relation.walletA}-${relation.walletB}`}
                    className="rounded-2xl border border-zinc-900 bg-black/30 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="text-xs text-zinc-600">
                          RELATIONSHIP {index + 1}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-300">
                          <span>{shortAddress(relation.walletA)}</span>
                          <span className="text-zinc-700">↔</span>
                          <span>{shortAddress(relation.walletB)}</span>
                        </div>
                      </div>

                      <div
                        className={`w-fit rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide ${
                          hasDirectTransfer
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-violet-500/20 bg-violet-500/10 text-violet-300"
                        }`}
                      >
                        {hasDirectTransfer
                          ? "DIRECT INTERACTION"
                          : "CO-OCCURRENCE"}
                      </div>
                    </div>

                    {hasDirectTransfer ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <MiniStat
                          label="Verified transfers"
                          value={String(
                            relation.directSolTransferCount
                          )}
                        />
                        <MiniStat
                          label="Total SOL"
                          value={formatSol(relation.directSol)}
                        />
                        <MiniStat
                          label="Evidence"
                          value={`${relation.directTransfers.length} tx`}
                        />
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <MiniStat
                          label="Shared transactions"
                          value={String(
                            relation.sharedTransactionCount
                          )}
                        />
                        <MiniStat
                          label="Direct SOL transfers"
                          value="None detected"
                        />
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-5 text-zinc-600">
                      {hasDirectTransfer
                        ? "Direct on-chain interaction is verified. This does not prove that the wallets share common ownership."
                        : "These wallets appeared in the same recent transactions. Co-occurrence alone does not prove coordination or common ownership."}
                    </p>

                    {relation.directTransfers.length > 0 && (
                      <div className="mt-4 border-t border-zinc-900 pt-4">
                        <div className="text-[10px] font-medium tracking-[0.15em] text-zinc-600">
                          VERIFIED EVIDENCE
                        </div>

                        <div className="mt-3 space-y-2">
                          {relation.directTransfers.map(
                            (transfer, transferIndex) => (
                              <div
                                key={transfer.signature}
                                className="flex flex-col justify-between gap-2 text-xs sm:flex-row"
                              >
                                <span className="text-zinc-500">
                                  Transfer {transferIndex + 1}
                                </span>

                                <span className="font-mono text-zinc-400">
                                  {shortAddress(transfer.signature)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/5 p-5">
            <div className="text-xs font-medium tracking-[0.15em] text-violet-300">
              AYZO METHODOLOGY
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Direct transfers are treated as verified interaction evidence.
              Shared transactions are weaker signals. Neither is automatically
              treated as proof of insider activity, coordination or common
              ownership.
            </p>
          </div>
        </>
      )}
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
      <div className="mt-2 text-xl font-semibold text-zinc-200">
        {value}
      </div>
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
      <div className="mt-2 text-sm font-medium text-zinc-300">
        {value}
      </div>
    </div>
  );
}
