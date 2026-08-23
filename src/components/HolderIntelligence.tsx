"use client";

import { useEffect, useState } from "react";

type Holder = {
  rank: number;
  owner: string;
  amount: string;
  percentage: number;
  tokenAccountCount: number;
};

type HolderResult = {
  ok: true;
  tokenAccountsAnalyzed: number;
  uniqueOwners: number;
  unresolvedAccounts: number;
  concentration: {
    top1: number;
    top5: number;
    top10: number;
    top20: number;
  };
  owners: Holder[];
};

type HolderFailure = {
  ok: false;
  error: string;
  details?: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function pct(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function HolderIntelligence({
  address,
}: {
  address: string;
}) {
  const [data, setData] = useState<HolderResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch("/api/solana/holders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address }),
        });

        const result = (await response.json()) as HolderResult | HolderFailure;

        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setData(result);
      } catch {
        if (!cancelled) {
          setError("Holder intelligence is temporarily unavailable.");
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

  return (
    <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8">
      <div>
        <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
          HOLDER INTELLIGENCE
        </div>

        <h3 className="mt-2 text-xl font-semibold">
          Ownership concentration
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Largest on-chain token accounts resolved to owner wallets.
        </p>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-zinc-900 bg-black/30 p-5 text-sm text-zinc-500">
          Analyzing holder distribution...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-sm font-medium text-amber-300">
            Holder data unavailable
          </div>

          <div className="mt-2 text-xs leading-5 text-zinc-500">
            {error}
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Top 1", pct(data.concentration.top1)],
              ["Top 5", pct(data.concentration.top5)],
              ["Top 10", pct(data.concentration.top10)],
              ["Top 20", pct(data.concentration.top20)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-900 bg-black/30 p-5"
              >
                <div className="text-xs text-zinc-600">{label}</div>
                <div className="mt-2 text-xl font-semibold text-zinc-200">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-xs text-zinc-600">Accounts analyzed</div>
              <div className="mt-2 text-sm font-medium">
                {data.tokenAccountsAnalyzed}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-xs text-zinc-600">Unique owners</div>
              <div className="mt-2 text-sm font-medium">
                {data.uniqueOwners}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-xs text-zinc-600">Unresolved</div>
              <div className="mt-2 text-sm font-medium">
                {data.unresolvedAccounts}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-900">
            <div className="border-b border-zinc-900 bg-black/30 px-5 py-4 text-xs font-medium tracking-[0.14em] text-zinc-500">
              LARGEST OWNERS
            </div>

            {data.owners.slice(0, 5).map((holder) => (
              <div
                key={holder.owner}
                className="flex items-center justify-between border-b border-zinc-900/80 px-5 py-4 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-5 text-xs text-zinc-700">
                    {holder.rank}
                  </div>

                  <div className="font-mono text-xs text-zinc-400">
                    {shortAddress(holder.owner)}
                  </div>
                </div>

                <div className="text-sm font-medium">
                  {pct(holder.percentage)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs leading-5 text-zinc-600">
            Concentration alone is not treated as a risk signal. AYZO will
            classify exchanges, liquidity pools, treasury accounts and other
            known entities before generating risk findings.
          </div>
        </>
      )}
    </div>
  );
}
