"use client";

import { useEffect, useState } from "react";

type HolderResponse =
  | { ok: true; owners: { owner: string }[] }
  | { ok: false; error: string };

type FundingTransfer = {
  signature: string;
  source: string;
  destination: string;
  lamports: string;
  sol: number;
  blockTime: number | null;
};

type WalletFunding = {
  wallet: string;
  recentIncomingTransfers: FundingTransfer[];
  uniqueRecentSources: number;
};

type FundingResponse =
  | {
      ok: true;
      walletsAnalyzed: number;
      incomingTransfersDetected: number;
      sharedFundingSourcesDetected: number;
      sharedSources: unknown[];
      perWallet: WalletFunding[];
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatSol(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

export default function FundingIntelligence({
  address,
}: {
  address: string;
}) {
  const [data, setData] = useState<FundingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError("");

        const holderResponse = await fetch("/api/solana/holders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });

        const holders = (await holderResponse.json()) as HolderResponse;

        if (!holders.ok) {
          throw new Error(holders.error);
        }

        const addresses = holders.owners
          .slice(0, 5)
          .map((item) => item.owner);

        const response = await fetch("/api/solana/funding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses }),
        });

        const result = (await response.json()) as FundingResponse;

        if (cancelled) return;

        if (!result.ok) {
          throw new Error(result.details || result.error);
        }

        setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Funding analysis unavailable."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const success = data && data.ok ? data : null;

  return (
    <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8">
      <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
        FUNDING INTELLIGENCE
      </div>

      <h3 className="mt-2 text-xl font-semibold">
        Recent funding signals
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        AYZO checks whether major holder wallets recently received direct SOL
        funding and whether multiple wallets share the same source.
      </p>

      {loading && (
        <div className="mt-6 rounded-2xl border border-zinc-900 bg-black/30 p-5 text-sm text-zinc-500">
          Analyzing recent funding activity...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-300">
          Funding analysis unavailable: {error}
        </div>
      )}

      {!loading && success && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Wallets analyzed" value={String(success.walletsAnalyzed)} />
            <Stat
              label="Incoming transfers"
              value={String(success.incomingTransfersDetected)}
            />
            <Stat
              label="Shared sources"
              value={String(success.sharedFundingSourcesDetected)}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-900 bg-black/30 p-5">
            <div className="text-sm font-medium text-zinc-300">
              {success.sharedFundingSourcesDetected > 0
                ? "Shared recent funding source detected"
                : "No shared recent funding source detected"}
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              A shared source is a relationship signal only. It does not prove
              common ownership, insider activity or coordination.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {success.perWallet
              .filter((wallet) => wallet.recentIncomingTransfers.length > 0)
              .map((wallet) => (
                <div
                  key={wallet.wallet}
                  className="rounded-2xl border border-zinc-900 bg-black/30 p-5"
                >
                  <div className="font-mono text-xs text-zinc-400">
                    {shortAddress(wallet.wallet)}
                  </div>

                  {wallet.recentIncomingTransfers.map((transfer) => (
                    <div
                      key={transfer.signature}
                      className="mt-4 border-t border-zinc-900 pt-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MiniStat
                          label="Source"
                          value={shortAddress(transfer.source)}
                        />
                        <MiniStat
                          label="Incoming SOL"
                          value={formatSol(transfer.sol)}
                        />
                        <MiniStat
                          label="Evidence"
                          value={shortAddress(transfer.signature)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          <div className="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/5 p-5">
            <div className="text-xs font-medium tracking-[0.15em] text-violet-300">
              AYZO METHODOLOGY
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              This alpha analyzes recent direct SOL funding only. It does not
              claim to identify the original funder of a wallet.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-4">
      <div className="text-[11px] text-zinc-600">{label}</div>
      <div className="mt-2 font-mono text-xs text-zinc-300">{value}</div>
    </div>
  );
}
