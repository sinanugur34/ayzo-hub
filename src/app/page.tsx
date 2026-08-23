"use client";

import { FormEvent, useState } from "react";
import { isAddress } from "@solana/kit";
import IntelligenceReport from "@/components/IntelligenceReport";

type MintInfo = {
  supply: string;
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
};

type TokenSuccess = {
  ok: true;
  network: string;
  address: string;
  isTokenMint: true;
  tokenProgram: string;
  accountOwner: string | null;
  mint: MintInfo;
};

type TokenFailure = {
  ok: false;
  error: string;
  details?: string | null;
  accountOwner?: string | null;
};

type TokenResponse = TokenSuccess | TokenFailure;

function shortAddress(address: string | null) {
  if (!address) return "Revoked";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatSupply(raw: string, decimals: number) {
  try {
    const value = BigInt(raw);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = value / divisor;
    const fraction = value % divisor;

    const wholeFormatted = whole.toLocaleString("en-US");

    if (fraction === BigInt(0)) {
      return wholeFormatted;
    }

    const fractionText = fraction
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "")
      .slice(0, 4);

    return fractionText
      ? `${wholeFormatted}.${fractionText}`
      : wholeFormatted;
  } catch {
    return raw;
  }
}

export default function Home() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenSuccess | null>(null);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = tokenAddress.trim();

    setResult(null);

    if (!value) {
      setIsValid(false);
      setMessage("Enter a Solana token address.");
      return;
    }

    if (!isAddress(value)) {
      setIsValid(false);
      setMessage("This is not a valid Solana address.");
      return;
    }

    setLoading(true);
    setMessage("Reading Solana mainnet...");
    setIsValid(null);

    try {
      const response = await fetch("/api/solana/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: value,
        }),
      });

      const data = (await response.json()) as TokenResponse;

      if (!data.ok) {
        setIsValid(false);
        setMessage(data.error);
        return;
      }

      setResult(data);
      setIsValid(true);
      setMessage("Verified token mint on Solana mainnet.");
    } catch {
      setIsValid(false);
      setMessage("Unable to reach the AYZO analysis service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[-350px] right-[-200px] h-[600px] w-[600px] rounded-full bg-purple-800/10 blur-[160px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
            <span className="text-sm font-semibold text-violet-300">A</span>
          </div>

          <div>
            <div className="text-lg font-semibold tracking-[0.22em]">AYZO</div>
            <div className="text-[9px] tracking-[0.18em] text-zinc-600">
              ON-CHAIN INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs text-zinc-400">
          Private Alpha
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-28 pt-16 text-center">
        <div className="mb-6 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-2 text-xs font-medium tracking-wide text-violet-300">
          SOLANA INVESTIGATION
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          Know what&apos;s
          <span className="block bg-gradient-to-r from-violet-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
            behind it.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Investigate token risk, wallet relationships and hidden on-chain
          activity before you interact.
        </p>

        <form onSubmit={handleAnalyze} className="mt-12 w-full max-w-3xl">
          <div
            className={`rounded-2xl border bg-zinc-950/80 p-2 shadow-2xl backdrop-blur-xl ${
              isValid === false
                ? "border-red-500/40"
                : isValid === true
                  ? "border-emerald-500/40"
                  : "border-zinc-800/80"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={tokenAddress}
                onChange={(event) => {
                  setTokenAddress(event.target.value);
                  setMessage("");
                  setIsValid(null);
                  setResult(null);
                }}
                placeholder="Paste a Solana token address"
                spellCheck={false}
                autoComplete="off"
                className="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-[11px] text-white outline-none placeholder:text-zinc-600 sm:h-14 sm:px-5 sm:text-sm"
              />

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-auto sm:px-7"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          {message ? (
            <div
              className={`mt-4 text-xs ${
                isValid === false
                  ? "text-red-400"
                  : isValid === true
                    ? "text-emerald-400"
                    : "text-violet-300"
              }`}
            >
              {message}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              No wallet connection required
            </div>
          )}
        </form>

        {result && (
          <section className="mt-12 w-full max-w-4xl text-left">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-purple-950/10 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col justify-between gap-5 border-b border-zinc-900 pb-6 sm:flex-row sm:items-center">
                <div>
                  <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
                    AYZO TOKEN VERIFICATION
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Verified Solana Token
                  </h2>

                  <div className="mt-2 break-all font-mono text-xs text-zinc-500">
                    {result.address}
                  </div>
                </div>

                <div className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
                  ON-CHAIN VERIFIED
                </div>
              </div>

              <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  label="Network"
                  value="Solana Mainnet"
                />

                <InfoCard
                  label="Token Program"
                  value={result.tokenProgram}
                />

                <InfoCard
                  label="Decimals"
                  value={String(result.mint.decimals)}
                />

                <InfoCard
                  label="Token Supply"
                  value={formatSupply(
                    result.mint.supply,
                    result.mint.decimals
                  )}
                />

                <InfoCard
                  label="Mint Authority"
                  value={shortAddress(result.mint.mintAuthority)}
                  status={
                    result.mint.mintAuthority
                      ? "Authority active"
                      : "Revoked"
                  }
                />

                <InfoCard
                  label="Freeze Authority"
                  value={shortAddress(result.mint.freezeAuthority)}
                  status={
                    result.mint.freezeAuthority
                      ? "Authority active"
                      : "Revoked"
                  }
                />
              </div>


            </div>

            <IntelligenceReport address={result.address} />
          </section>
        )}

        {!result && (
          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              ["Wallet Intelligence", "Detect potential relationships"],
              ["Risk Evidence", "See what triggered each finding"],
              ["AI Explanation", "Understand what actually matters"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5"
              >
                <div className="text-sm font-medium text-zinc-200">
                  {title}
                </div>

                <div className="mt-2 text-xs leading-5 text-zinc-600">
                  {description}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-xs text-zinc-600">{label}</div>

      <div className="mt-2 break-all text-sm font-medium text-zinc-200">
        {value}
      </div>

      {status && (
        <div className="mt-2 text-xs text-zinc-500">
          {status}
        </div>
      )}
    </div>
  );
}
