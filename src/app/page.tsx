"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import {
  isAddress,
} from "@solana/kit";

import BitcoinIntelligenceReport from "@/components/BitcoinIntelligenceReport";
import DogecoinIntelligenceReport from "@/components/DogecoinIntelligenceReport";
import EvmIntelligenceReport from "@/components/EvmIntelligenceReport";
import FreePlanStatus from "@/components/FreePlanStatus";
import IntelligenceReport from "@/components/IntelligenceReport";
import PricingPlans from "@/components/PricingPlans";
import HeaderAuthControls from "@/components/auth/HeaderAuthControls";
import {
  isLiveAnalysisNetworkId,
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

const BITCOIN_MAINNET_SHAPE =
  /^(?:[13][1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{6,87})$/i;

const DOGECOIN_MAINNET_SHAPE =
  /^(?:D|9|A)[1-9A-HJ-NP-Za-km-z]{25,34}$/;

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


type AddressDetectionResponse =
  | {
      ok: true;
      network:
        | "bitcoin"
        | "dogecoin"
        | "solana"
        | "evm"
        | null;
    }
  | {
      ok: false;
      error: string;
    };

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

  const [
    bitcoinAnalysis,
    setBitcoinAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    dogecoinAnalysis,
    setDogecoinAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  function resetResult() {
    setSolanaResult(
      null
    );

    setEvmAnalysis(
      null
    );

    setBitcoinAnalysis(
      null
    );

    setDogecoinAnalysis(
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

  useEffect(() => {
    const value =
      tokenAddress.trim();

    if (
      !value ||
      value.length < 20
    ) {
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                "/api/address-detect",
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      address:
                        value,
                    }),

                  signal:
                    controller.signal,
                }
              );

            if (!response.ok) {
              return;
            }

            const result =
              (
                await response.json()
              ) as AddressDetectionResponse;

            if (
              !result.ok ||
              !result.network
            ) {
              return;
            }

            let detectedNetwork:
              LiveAnalysisNetworkId | null =
                null;

            if (
              result.network ===
                "evm"
            ) {
              detectedNetwork =
                NETWORKS[
                  network
                ].family ===
                  "evm"
                  ? network
                  : "ethereum";
            } else if (
              isLiveAnalysisNetworkId(
                result.network
              )
            ) {
              detectedNetwork =
                result.network;
            }

            if (
              !detectedNetwork ||
              detectedNetwork ===
                network
            ) {
              return;
            }

            setNetwork(
              detectedNetwork
            );

            setSolanaResult(
              null
            );

            setEvmAnalysis(
              null
            );

            setBitcoinAnalysis(
              null
            );

            setDogecoinAnalysis(
              null
            );

            setIsValid(
              null
            );

            setMessage(
              `${networkName(
                detectedNetwork
              )} detected automatically.`
            );
          } catch {
            // Detection is a UX enhancement.
            // Analysis remains authoritative.
          }
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );

      controller.abort();
    };
  }, [
    tokenAddress,
    network,
  ]);

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
        "Enter an address for the selected network."
      );

      return;
    }

    const isDogecoinAddressShape =
      DOGECOIN_MAINNET_SHAPE.test(
        value
      );

    if (
      network ===
        "dogecoin"
    ) {
      if (
        !isDogecoinAddressShape
      ) {
        setIsValid(false);

        setMessage(
          "This does not look like a valid Dogecoin mainnet address."
        );

        return;
      }

      if (
        network !==
        "dogecoin"
      ) {
        setNetwork(
          "dogecoin"
        );
      }

      setIsValid(true);

      setMessage(
        "Dogecoin address accepted. AYZO intelligence is running."
      );

      setDogecoinAnalysis({
        address:
          value,
      });

      return;
    }

    const isBitcoinAddressShape =
      BITCOIN_MAINNET_SHAPE.test(
        value
      );

    if (
      network ===
        "bitcoin" ||
      isBitcoinAddressShape
    ) {
      if (
        !isBitcoinAddressShape
      ) {
        setIsValid(false);

        setMessage(
          "This does not look like a valid Bitcoin mainnet address."
        );

        return;
      }

      if (
        network !==
        "bitcoin"
      ) {
        setNetwork(
          "bitcoin"
        );
      }

      setIsValid(true);

      setMessage(
        network ===
          "bitcoin"
          ? "Bitcoin address accepted. AYZO intelligence is running."
          : "Bitcoin address detected automatically. AYZO intelligence is running."
      );

      setBitcoinAnalysis({
        address:
          value,
      });

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
        "This is not a valid address for the selected network."
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
        "This is not a valid address for the selected network."
      );
      return;
    }

    if (
      !isLiveAnalysisNetworkId(
        detectedNetwork
      )
    ) {
      setIsValid(false);
      setMessage(
        "This network is not available for live analysis yet."
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
      null ||
    bitcoinAnalysis !==
      null ||
    dogecoinAnalysis !==
      null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[150px]" />

      <div className="pointer-events-none absolute bottom-[-350px] right-[-200px] h-[600px] w-[600px] rounded-full bg-purple-800/10 blur-[160px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-7 lg:px-8">
        <div className="relative h-14 w-56 sm:h-16 sm:w-64">
          <Image
            src="/ayzo-logo.png"
            alt="AYZO"
            fill
            priority
            sizes="256px"
            className="object-contain object-left"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs text-zinc-400">
            Early Access
          </div>

          <HeaderAuthControls />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-28 pt-10 text-center sm:pt-14">
        <div className="mb-5 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-violet-300 sm:text-xs">
          EVIDENCE-FIRST ON-CHAIN INTELLIGENCE
        </div>

        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
          Understand the wallet.

          <span className="block bg-gradient-to-r from-violet-300 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
            Follow the evidence.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
          Analyze wallets, tokens and transaction evidence across 15
          live networks — without connecting a wallet.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2 text-[11px] font-medium text-zinc-300 shadow-[0_0_24px_rgba(16,185,129,0.04)] sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            15 live networks
          </span>

          <span className="flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-3.5 py-2 text-[11px] font-medium text-zinc-300 sm:text-xs">
            <span className="text-violet-400">
              ◇
            </span>
            No wallet connection
          </span>

          <span className="flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-3.5 py-2 text-[11px] font-medium text-zinc-300 sm:text-xs">
            <span className="text-violet-400">
              ✓
            </span>
            Evidence-first results
          </span>
        </div>

        <form
          id="analyzer"
          onSubmit={
            handleAnalyze
          }
          className="mt-9 w-full max-w-4xl"
        >
          <div className="relative z-40 mb-3 w-full overflow-visible rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-2 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 flex-wrap gap-1.5">
                {(
                  [
                    "ethereum",
                    "solana",
                    "bitcoin",
                    "dogecoin",
                  ] as const
                ).map(
                  id => {
                    const definition =
                      NETWORKS[id];

                    const active =
                      network ===
                      id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          selectNetwork(
                            id
                          )
                        }
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                          active
                            ? "bg-white text-black shadow-lg"
                            : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
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

              <details className="group relative z-50 w-full shrink-0 sm:w-52">
                <summary className="relative flex h-14 cursor-pointer list-none flex-col justify-center rounded-xl border border-violet-500/30 bg-violet-500/[0.06] px-3 pr-10 text-left shadow-[0_0_24px_rgba(139,92,246,0.06)] transition hover:border-violet-400/50 hover:bg-violet-500/[0.09]">
                  <span className="text-[8px] font-semibold tracking-[0.16em] text-violet-400">
                    ALL NETWORKS · 15 LIVE
                  </span>

                  <span className="mt-1 text-xs font-medium text-zinc-100">
                    {NETWORKS[network].name}
                    {" · "}
                    {NETWORKS[network].shortName}
                  </span>

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-violet-400 transition group-open:rotate-180">
                    ↓
                  </span>
                </summary>

                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[min(28rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-violet-500/30 bg-zinc-950/98 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                  <div className="flex items-center justify-between px-2 pb-2 pt-1">
                    <span className="text-[9px] font-semibold tracking-[0.16em] text-violet-400">
                      SELECT NETWORK
                    </span>

                    <span className="text-[9px] text-zinc-600">
                      15 LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {LIVE_NETWORKS.map(
                      id => {
                        const definition =
                          NETWORKS[id];

                        const active =
                          network === id;

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={event => {
                              selectNetwork(id);

                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute(
                                  "open"
                                );
                            }}
                            className={`flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                              active
                                ? "bg-violet-500/15 text-white"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                            }`}
                          >
                            <span className="truncate font-medium">
                              {definition.name}
                            </span>

                            <span
                              className={`shrink-0 ${
                                active
                                  ? "text-violet-300"
                                  : "text-zinc-700"
                              }`}
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
              </details>
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
                    : network ===
                        "bitcoin"
                      ? "Paste a Bitcoin address"
                      : network ===
                          "dogecoin"
                        ? "Paste a Dogecoin address"
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

        {bitcoinAnalysis && (
          <section className="mt-12 w-full max-w-4xl">
            <BitcoinIntelligenceReport
              key={
                bitcoinAnalysis.address
              }
              address={
                bitcoinAnalysis.address
              }
            />
          </section>
        )}

        {dogecoinAnalysis && (
          <section className="mt-12 w-full max-w-4xl">
            <DogecoinIntelligenceReport
              key={
                dogecoinAnalysis.address
              }
              address={
                dogecoinAnalysis.address
              }
            />
          </section>
        )}

        {!hasResult && (
          <div className="mt-14 grid w-full max-w-4xl gap-4 text-left lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/55 p-6 backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
                    YOUR RESEARCH DESK
                  </div>

                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
                    Start with the evidence.
                  </h2>
                </div>

                <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[10px] text-zinc-500">
                  15 networks
                </div>
              </div>

              <div className="mt-6 grid gap-2.5">
                {[
                  [
                    "Funding provenance",
                    "Trace where observed funds came from.",
                  ],
                  [
                    "Wallet relationships",
                    "Explore transaction-backed connections.",
                  ],
                  [
                    "Canonical evidence",
                    "Inspect the transaction evidence behind findings.",
                  ],
                ].map(
                  ([title, description]) => (
                    <div
                      key={title}
                      className="group flex items-center gap-4 rounded-2xl border border-zinc-900 bg-black/20 p-4 transition hover:border-violet-500/20 hover:bg-violet-500/[0.03]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/[0.06]">
                        <span className="h-2 w-2 rounded-full bg-violet-400 transition group-hover:shadow-[0_0_18px_rgba(167,139,250,0.8)]" />
                      </div>

                      <div>
                        <div className="text-sm font-medium text-zinc-200">
                          {title}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-zinc-600">
                          {description}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-medium tracking-[0.18em] text-zinc-500">
                    EXAMPLE INVESTIGATION
                  </div>

                  <div className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-medium text-emerald-400">
                    SAMPLE
                  </div>
                </div>

                <div className="mt-5 font-mono text-xs text-zinc-500">
                  0x8f...c21
                </div>

                <div className="mt-1 text-sm font-medium text-zinc-200">
                  Ethereum
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["Funding source", "Found"],
                    ["Relationships", "8 nodes"],
                    ["Verification", "Verified"],
                    ["Observed activity", "81 tx"],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border-b border-zinc-900 pb-3 text-xs last:border-0 last:pb-0"
                      >
                        <span className="text-zinc-600">
                          {label}
                        </span>

                        <span className="font-medium text-zinc-300">
                          {value}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-zinc-900 bg-black/25 px-4 py-3 text-[10px] leading-4 text-zinc-600">
                  Illustrative example only. No live request is made and no analysis credit is used.
                </div>
              </div>
            </div>
          </div>
        )}

        <PlansAccessPanel />
      </section>
    </main>
  );
}

function PlansAccessPanel() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  return (
    <div className="mt-14 w-full max-w-4xl border-t border-zinc-900 pt-7 text-left">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="ayzo-plans-access"
        onClick={() =>
          setIsOpen(
            current => !current
          )
        }
        className="group mx-auto flex w-full max-w-md cursor-pointer items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.07] px-5 py-4 text-left shadow-[0_0_32px_rgba(139,92,246,0.06)] transition hover:border-violet-400/50 hover:bg-violet-500/[0.1]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-sm font-medium text-violet-300">
          {isOpen
            ? "−"
            : "+"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold tracking-[0.18em] text-violet-400">
            PRICING & ACCESS
          </div>

          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {isOpen
              ? "Close plans & access"
              : "Explore plans & access"}
          </div>

          <div className="mt-1 text-[11px] text-zinc-500">
            Compare Free, Pro and Advanced access.
          </div>
        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-black/30 text-xs text-zinc-400 transition group-hover:border-violet-500/30 group-hover:text-violet-300">
          {isOpen
            ? "↑"
            : "↓"}
        </span>
      </button>

      {isOpen && (
        <div
          id="ayzo-plans-access"
          className="mt-6"
        >
          <PricingPlans />
        </div>
      )}
    </div>
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
