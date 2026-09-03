"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  isAddress,
} from "@solana/kit";

import EvmIntelligenceReport from "@/components/EvmIntelligenceReport";
import FreePlanStatus from "@/components/FreePlanStatus";
import IntelligenceReport from "@/components/IntelligenceReport";
import ProComingSoon from "@/components/ProComingSoon";
import {
  resolveSelectedNetworkForAddress,
  type LiveAnalysisNetworkId,
  type LiveEvmNetworkId,
} from "@/lib/networks/addressSelection";
import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

const LIVE_NETWORKS =
  NETWORK_IDS.filter(
    (
      networkId
    ): networkId is LiveAnalysisNetworkId =>
      NETWORKS[
        networkId
      ].status === "live"
  );

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

type MintInfo = {
  supply: string;
  decimals: number;
  mintAuthority:
    string | null;
  freezeAuthority:
    string | null;
  isInitialized:
    boolean;
};

type TokenSuccess = {
  ok: true;
  network: string;
  address: string;
  isTokenMint: true;
  tokenProgram: string;
  accountOwner:
    string | null;
  mint: MintInfo;
};

type TokenFailure = {
  ok: false;
  error: string;
  details?:
    string | null;
  accountOwner?:
    string | null;
};

type TokenResponse =
  | TokenSuccess
  | TokenFailure;

function shortAddress(
  address:
    string | null
) {
  if (!address) {
    return "Revoked";
  }

  return (
    `${address.slice(0, 6)}` +
    `...` +
    `${address.slice(-6)}`
  );
}

function formatSupply(
  raw: string,
  decimals: number
) {
  try {
    const value =
      BigInt(raw);

    const divisor =
      BigInt(10) **
      BigInt(decimals);

    const whole =
      value / divisor;

    const fraction =
      value % divisor;

    const wholeFormatted =
      whole.toLocaleString(
        "en-US"
      );

    if (
      fraction ===
      BigInt(0)
    ) {
      return wholeFormatted;
    }

    const fractionText =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        )
        .slice(
          0,
          4
        );

    return fractionText
      ? `${wholeFormatted}.${fractionText}`
      : wholeFormatted;
  } catch {
    return raw;
  }
}

function networkName(
  network:
    LiveAnalysisNetworkId
) {
  return NETWORKS[
    network
  ].name;
}

export default function Home() {
  const [
    network,
    setNetwork,
  ] =
    useState<
      LiveAnalysisNetworkId
    >("solana");

  const [
    tokenAddress,
    setTokenAddress,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isValid,
    setIsValid,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    solanaResult,
    setSolanaResult,
  ] =
    useState<
      TokenSuccess | null
    >(null);

  const [
    evmAnalysis,
    setEvmAnalysis,
  ] =
    useState<{
      network:
        LiveEvmNetworkId;
      address:
        string;
    } | null>(null);

  function resetResult() {
    setSolanaResult(
      null
    );

    setEvmAnalysis(
      null
    );
  }

  function selectNetwork(
    value:
      LiveAnalysisNetworkId
  ) {
    setNetwork(value);
    setTokenAddress("");
    setMessage("");
    setIsValid(null);
    setLoading(false);
    resetResult();
  }

  async function handleAnalyze(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value =
      tokenAddress.trim();

    resetResult();

    if (!value) {
      setIsValid(false);

      setMessage(
        "Enter a Solana or EVM address."
      );

      return;
    }

    const isEvmAddress =
      EVM_ADDRESS.test(
        value
      );

    const isSolanaAddress =
      isAddress(
        value
      );

    if (
      !isEvmAddress &&
      !isSolanaAddress
    ) {
      setIsValid(false);

      setMessage(
        "This is not a valid Solana or EVM address."
      );

      return;
    }

    const detectedNetwork =
      resolveSelectedNetworkForAddress(
        network,
        isEvmAddress
          ? "evm"
          : "solana"
      );

    if (!detectedNetwork) {
      setIsValid(false);
      setMessage(
        "This is not a valid Solana or EVM address."
      );
      return;
    }

    if (
      detectedNetwork !==
      network
    ) {
      setNetwork(
        detectedNetwork
      );
    }

    try {
      await fetch(
        "/api/free/status",
        {
          cache:
            "no-store",

          credentials:
            "same-origin",
        }
      );
    } catch {
      // Quota status must not
      // block analysis.
    }

    if (
      NETWORKS[
        detectedNetwork
      ].family === "evm"
    ) {
      const evmNetwork =
        detectedNetwork as
          LiveEvmNetworkId;

      setIsValid(true);

      setMessage(
        network ===
          evmNetwork
          ? `${networkName(evmNetwork)} address accepted. AYZO intelligence is running.`
          : `${networkName(evmNetwork)} selected for this EVM address. AYZO intelligence is running.`
      );

      setEvmAnalysis({
        network:
          evmNetwork,
        address:
          value.toLowerCase(),
      });

      return;
    }

    setLoading(true);

    setMessage(
      network === "solana"
        ? "Reading Solana mainnet..."
        : "Solana address detected automatically. Reading mainnet..."
    );

    setIsValid(null);

    try {
      const response =
        await fetch(
          "/api/solana/token",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(process.env.NODE_ENV !==
              "production"
                ? {
                    "x-ayzo-test-request":
                      "smoke",
                  }
                : {}),
            },

            body:
              JSON.stringify({
                address:
                  value,
              }),
          }
        );

      const data =
        (
          await response.json()
        ) as TokenResponse;

      if (!data.ok) {
        setIsValid(false);

        setMessage(
          data.error
        );

        return;
      }

      setSolanaResult(
        data
      );

      setIsValid(true);

      setMessage(
        "Verified token mint on Solana mainnet."
      );
    } catch {
      setIsValid(false);

      setMessage(
        "Unable to reach the AYZO analysis service."
      );
    } finally {
      setLoading(false);
    }
  }

  const hasResult =
    solanaResult !==
      null ||
    evmAnalysis !==
      null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[150px]" />

      <div className="pointer-events-none absolute bottom-[-350px] right-[-200px] h-[600px] w-[600px] rounded-full bg-purple-800/10 blur-[160px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
            <span className="text-sm font-semibold text-violet-300">
              A
            </span>
          </div>

          <div>
            <div className="text-lg font-semibold tracking-[0.22em]">
              AYZO
            </div>

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
          MULTICHAIN INTELLIGENCE
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          Know what&apos;s

          <span className="block bg-gradient-to-r from-violet-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
            behind it.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Find the connections. Detect the changes. Understand the
          evidence behind on-chain activity.
        </p>

        <form
          onSubmit={
            handleAnalyze
          }
          className="mt-12 w-full max-w-3xl"
        >
          <div className="mb-3 flex justify-center">
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
              {LIVE_NETWORKS.map(
                id => {
                  const definition =
                    NETWORKS[id];

                  const active =
                    network ===
                    id;

                  return (
                    <button
                      key={
                        id
                      }
                      type="button"
                      onClick={() =>
                        selectNetwork(
                          id
                        )
                      }
                      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition ${
                        active
                          ? "bg-white text-black shadow-lg"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span>
                        {definition.name}
                      </span>

                      <span
                        className={
                          active
                            ? "text-zinc-500"
                            : "text-zinc-700"
                        }
                      >
                        {
                          definition.shortName
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl border bg-zinc-950/80 p-3 shadow-2xl backdrop-blur-xl sm:p-2 ${
              isValid ===
              false
                ? "border-red-500/40"
                : isValid ===
                    true
                  ? "border-emerald-500/40"
                  : "border-zinc-800/80"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={
                  tokenAddress
                }
                onChange={
                  event => {
                    setTokenAddress(
                      event.target
                        .value
                    );

                    setMessage(
                      ""
                    );

                    setIsValid(
                      null
                    );

                    resetResult();
                  }
                }
                placeholder={
                  network ===
                  "solana"
                    ? "Paste a Solana token address"
                    : `Paste a ${networkName(network)} token, contract or wallet address`
                }
                spellCheck={
                  false
                }
                autoComplete="off"
                className="h-[200px] min-w-0 flex-1 rounded-2xl border-2 border-zinc-400/90 bg-zinc-900/95 px-5 py-4 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 sm:h-14 sm:rounded-xl sm:border-0 sm:bg-transparent sm:px-5 sm:py-0 sm:text-sm sm:focus:ring-0"
              />

              <button
                type="submit"
                disabled={
                  loading
                }
                className="h-12 w-36 self-end rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-auto sm:self-stretch sm:px-7"
              >
                {loading
                  ? "Analyzing..."
                  : "Analyze"}
              </button>
            </div>
          </div>

          {message ? (
            <div
              className={`mt-4 text-xs ${
                isValid ===
                false
                  ? "text-red-400"
                  : isValid ===
                      true
                    ? "text-emerald-400"
                    : "text-violet-300"
              }`}
            >
              {message}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              {networkName(
                network
              )}{" "}
              · No wallet connection required
            </div>
          )}
        </form>

        <FreePlanStatus />

        {solanaResult && (
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
                    {
                      solanaResult.address
                    }
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
                  value={
                    solanaResult.tokenProgram
                  }
                />

                <InfoCard
                  label="Decimals"
                  value={String(
                    solanaResult
                      .mint
                      .decimals
                  )}
                />

                <InfoCard
                  label="Token Supply"
                  value={formatSupply(
                    solanaResult
                      .mint
                      .supply,

                    solanaResult
                      .mint
                      .decimals
                  )}
                />

                <InfoCard
                  label="Mint Authority"
                  value={shortAddress(
                    solanaResult
                      .mint
                      .mintAuthority
                  )}
                  status={
                    solanaResult
                      .mint
                      .mintAuthority
                      ? "Authority active"
                      : "Revoked"
                  }
                />

                <InfoCard
                  label="Freeze Authority"
                  value={shortAddress(
                    solanaResult
                      .mint
                      .freezeAuthority
                  )}
                  status={
                    solanaResult
                      .mint
                      .freezeAuthority
                      ? "Authority active"
                      : "Revoked"
                  }
                />
              </div>
            </div>

            <IntelligenceReport
              key={
                solanaResult.address
              }
              address={
                solanaResult.address
              }
            />
          </section>
        )}

        {evmAnalysis && (
          <section className="mt-12 w-full max-w-4xl">
            <EvmIntelligenceReport
              key={`${evmAnalysis.network}:${evmAnalysis.address}`}
              address={
                evmAnalysis.address
              }
              network={
                evmAnalysis.network
              }
            />
          </section>
        )}

        {!hasResult && (
          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              [
                "Wallet Intelligence",
                "Reveal observed on-chain relationships",
              ],

              [
                "Evidence First",
                "See what supports every finding",
              ],

              [
                "Multichain",
                "Solana, Ethereum and Base live",
              ],
            ].map(
              ([
                title,
                description,
              ]) => (
                <div
                  key={
                    title
                  }
                  className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5"
                >
                  <div className="text-sm font-medium text-zinc-200">
                    {
                      title
                    }
                  </div>

                  <div className="mt-2 text-xs leading-5 text-zinc-600">
                    {
                      description
                    }
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <ProComingSoon />
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
      <div className="text-xs text-zinc-600">
        {label}
      </div>

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
