"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import dynamic from "next/dynamic";

import {
  isAddress,
} from "@solana/kit";

import FreePlanStatus from "@/components/FreePlanStatus";
import AppResearchDesk from "@/components/AppResearchDesk";
import AnalysisWorkspaceFrame from "@/components/AnalysisWorkspaceFrame";
import HeaderAuthControls from "@/components/auth/HeaderAuthControls";
import {
  trackEvent,
} from "@/lib/analytics/client";
import {
  parseSeoAnalysisPrefill,
} from "@/lib/seoAnalysisPrefill";
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

import {
  isCardanoPaymentAddress,
} from "@/lib/intelligence/cardano/address";

import {
  normalizeAptosAddress,
} from "@/lib/intelligence/aptos/address";

import {
  normalizeHederaAccountId,
} from "@/lib/intelligence/hedera/address";


/*
  AYZO MOBILE V1 — DEFERRED INTELLIGENCE REPORTS

  Each network report is loaded only when its UI is actually
  rendered. This keeps all supported networks available while
  avoiding a single giant initial client bundle.
*/
function DeferredPanelLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-2xl border border-[#26384f] bg-gradient-to-b from-[#102237] to-[#0b1727] p-5 text-left sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300"
        />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
            Loading investigation
          </div>
          <div className="mt-1 text-sm font-medium text-zinc-200">
            {label}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#1a2a40]">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-cyan-400/70" />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-zinc-500">
        Preparing the selected evidence workspace.
      </p>
    </div>
  );
}

const BitcoinIntelligenceReport = dynamic(
  () =>
    import("@/components/BitcoinIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Bitcoin intelligence"
      />
    ),
  }
);

const DogecoinIntelligenceReport = dynamic(
  () =>
    import("@/components/DogecoinIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Dogecoin intelligence"
      />
    ),
  }
);

const LitecoinIntelligenceReport = dynamic(
  () =>
    import("@/components/LitecoinIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Litecoin intelligence"
      />
    ),
  }
);

const SuiIntelligenceReport = dynamic(
  () =>
    import("@/components/SuiIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Sui intelligence"
      />
    ),
  }
);

const TonIntelligenceReport = dynamic(
  () =>
    import("@/components/TonIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="TON intelligence"
      />
    ),
  }
);

const StellarIntelligenceReport = dynamic(
  () =>
    import("@/components/StellarIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Stellar intelligence"
      />
    ),
  }
);

const CardanoIntelligenceReport = dynamic(
  () =>
    import("@/components/CardanoIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Cardano intelligence"
      />
    ),
  }
);

const AptosIntelligenceReport = dynamic(
  () =>
    import("@/components/AptosIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Aptos intelligence"
      />
    ),
  }
);

const HederaIntelligenceReport = dynamic(
  () =>
    import("@/components/HederaIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Hedera intelligence"
      />
    ),
  }
);

const ZcashIntelligenceReport = dynamic(
  () =>
    import("@/components/ZcashIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Zcash intelligence"
      />
    ),
  }
);

const AlgorandIntelligenceReport = dynamic(
  () =>
    import("@/components/AlgorandIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Algorand intelligence"
      />
    ),
  }
);

const PolkadotIntelligenceReport = dynamic(
  () =>
    import("@/components/PolkadotIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Polkadot intelligence"
      />
    ),
  }
);

const CosmosIntelligenceReport = dynamic(
  () =>
    import("@/components/CosmosIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Cosmos intelligence"
      />
    ),
  }
);

const InjectiveIntelligenceReport = dynamic(
  () =>
    import("@/components/InjectiveIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Injective intelligence"
      />
    ),
  }
);

const HyperliquidIntelligenceReport = dynamic(
  () =>
    import("@/components/HyperliquidIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Hyperliquid intelligence"
      />
    ),
  }
);

const TronIntelligenceReport = dynamic(
  () =>
    import("@/components/TronIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="TRON intelligence"
      />
    ),
  }
);

const XrplIntelligenceReport = dynamic(
  () =>
    import("@/components/XrplIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="XRP Ledger intelligence"
      />
    ),
  }
);

const EvmIntelligenceReport = dynamic(
  () =>
    import("@/components/EvmIntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="EVM intelligence"
      />
    ),
  }
);

const IntelligenceReport = dynamic(
  () =>
    import("@/components/IntelligenceReport"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Solana intelligence"
      />
    ),
  }
);

const ExampleInvestigationGallery = dynamic(
  () =>
    import("@/components/ExampleInvestigationGallery"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Example investigations"
      />
    ),
  }
);

const PricingPlans = dynamic(
  () =>
    import("@/components/PricingPlans"),
  {
    loading: () => (
      <DeferredPanelLoading
        label="Plan comparison"
      />
    ),
  }
);

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

const LITECOIN_MAINNET_SHAPE =
  /^(?:(?:L|M|3)[1-9A-HJ-NP-Za-km-z]{25,34}|ltc1[ac-hj-np-z02-9]{6,87})$/i;

const SUI_ADDRESS_SHAPE =
  /^0x[0-9a-fA-F]{1,64}$/;

const TRON_ADDRESS_SHAPE =
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

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


type FinalFiveNetworkId =
  | "zcash"
  | "algorand"
  | "polkadot"
  | "cosmos"
  | "injective";


type AddressDetectionResponse =
  | {
      ok: true;
      network:
        | "bitcoin"
        | "dogecoin"
        | "litecoin"
        | "sui"
        | "ton"
        | "stellar"
        | "tron"
        | "xrp"
        | "cardano"
        | "zcash"
        | "algorand"
        | "polkadot"
        | "cosmos"
        | "injective"
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
    analysisSource,
    setAnalysisSource,
  ] =
    useState<
      "seo" | null
    >(null);

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

  const [
    litecoinAnalysis,
    setLitecoinAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    suiAnalysis,
    setSuiAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    tonAnalysis,
    setTonAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    stellarAnalysis,
    setStellarAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    cardanoAnalysis,
    setCardanoAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    aptosAnalysis,
    setAptosAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    hyperliquidAnalysis,
    setHyperliquidAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    tronAnalysis,
    setTronAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    xrpAnalysis,
    setXrpAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    hederaAnalysis,
    setHederaAnalysis,
  ] =
    useState<{
      address:
        string;
    } | null>(
      null
    );

  const [
    finalFiveAnalysis,
    setFinalFiveAnalysis,
  ] =
    useState<{
      network:
        FinalFiveNetworkId;

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

    setLitecoinAnalysis(
      null
    );

    setSuiAnalysis(
      null
    );

    setTonAnalysis(
      null
    );

    setStellarAnalysis(
      null
    );

    setCardanoAnalysis(
      null
    );

    setAptosAnalysis(
      null
    );
    setHyperliquidAnalysis(
      null
    );

    setTronAnalysis(
      null
    );

    setXrpAnalysis(
      null
    );

    setHederaAnalysis(
      null
    );

    setFinalFiveAnalysis(
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
    const prefill =
      parseSeoAnalysisPrefill(
        window.location.search
      );

    if (!prefill) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          setAnalysisSource(
            prefill.source
          );

          if (
            prefill.network
          ) {
            setNetwork(
              prefill.network
            );

            setMessage(
              `${networkName(
                prefill.network
              )} selected from AYZO research. Paste an address to analyze.`
            );
          } else {
            setMessage(
              "Opened from AYZO research. Select the correct network and paste an address to analyze."
            );
          }

          setIsValid(
            null
          );
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, []);

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

            if (
              network ===
                "litecoin" &&
              result.network ===
                "bitcoin" &&
              value.startsWith(
                "3"
              )
            ) {
              /*
               * Bitcoin and Litecoin can share
               * legacy P2SH version 0x05.
               * Preserve explicit Litecoin selection;
               * server checksum validation remains
               * authoritative during analysis.
               */
              return;
            }

            if (
              network ===
                "sui" &&
              result.network ===
                "evm" &&
              SUI_ADDRESS_SHAPE.test(
                value
              )
            ) {
              /*
               * Preserve explicit Sui selection for
               * structurally ambiguous 20-byte 0x
               * addresses. Server-side Sui validation
               * remains authoritative.
               */
              return;
            }

            if (
              network ===
                "aptos" &&
              normalizeAptosAddress(
                value
              ) &&
              (
                result.network ===
                  "evm" ||
                result.network ===
                  "sui"
              )
            ) {
              /*
               * Preserve explicit Aptos selection for
               * ambiguous 0x hexadecimal account forms.
               * Aptos is never auto-selected from generic
               * 0x input.
               */
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

            setLitecoinAnalysis(
              null
            );

            setSuiAnalysis(
              null
            );

            setTonAnalysis(
              null
            );

            setStellarAnalysis(
              null
            );
            setHyperliquidAnalysis(
              null
            );

            setTronAnalysis(
              null
            );

            setXrpAnalysis(
              null
            );

            setHederaAnalysis(
              null
            );

            setFinalFiveAnalysis(
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

    trackEvent(
      "analysis_submitted",
      {
        network,

        surface:
          "home",

        ...(analysisSource
          ? {
              source:
                analysisSource,
            }
          : {}),
      }
    );

    if (
      network ===
        "zcash" ||
      network ===
        "algorand" ||
      network ===
        "polkadot" ||
      network ===
        "cosmos" ||
      network ===
        "injective"
    ) {
      setLoading(
        true
      );

      try {
        const detectionResponse =
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
            }
          );

        const detection =
          (
            await detectionResponse.json()
          ) as AddressDetectionResponse;

        if (
          !detectionResponse.ok ||
          !detection.ok ||
          detection.network !==
            network
        ) {
          setIsValid(
            false
          );

          setMessage(
            network ===
              "zcash"
              ? "AYZO currently supports checksum-valid transparent Zcash mainnet addresses only. Shielded and unified privacy evidence is not reconstructed."
              : `This does not look like a valid ${networkName(
                  network
                )} mainnet address.`
          );

          return;
        }

        setIsValid(
          true
        );

        setMessage(
          `${networkName(
            network
          )} address accepted. AYZO intelligence is running.`
        );

        setFinalFiveAnalysis({
          network,

          address:
            value,
        });

        return;
      } catch {
        setIsValid(
          false
        );

        setMessage(
          `Unable to verify this ${networkName(
            network
          )} address.`
        );

        return;
      } finally {
        setLoading(
          false
        );
      }
    }

    if (
      network ===
        "cardano" ||
      isCardanoPaymentAddress(
        value
      )
    ) {
      if (
        !isCardanoPaymentAddress(
          value
        )
      ) {
        setIsValid(
          false
        );

        setMessage(
          "This does not look like a valid Cardano mainnet payment address."
        );

        return;
      }

      if (
        network !==
          "cardano"
      ) {
        setNetwork(
          "cardano"
        );
      }

      setIsValid(
        true
      );

      setMessage(
        network ===
          "cardano"
          ? "Cardano address accepted. AYZO intelligence is running."
          : "Cardano address detected automatically. AYZO intelligence is running."
      );

      setCardanoAnalysis({
        address:
          value.toLowerCase(),
      });

      return;
    }

    if (
      network ===
        "aptos"
    ) {
      const normalizedAptos =
        normalizeAptosAddress(
          value
        );

      if (!normalizedAptos) {
        setIsValid(
          false
        );

        setMessage(
          "This does not look like a valid Aptos account address."
        );

        return;
      }

      setIsValid(
        true
      );

      setMessage(
        "Aptos account accepted. AYZO intelligence is running."
      );

      setAptosAnalysis({
        address:
          normalizedAptos,
      });

      return;
    }

    if (
      network ===
        "hyperliquid"
    ) {
      setIsValid(
        true
      );

      setMessage(
        "Hyperliquid account accepted. AYZO is reading HyperCore and HyperEVM evidence."
      );

      setHyperliquidAnalysis({
        address:
          value,
      });

      return;
    }

    if (
      network ===
        "stellar"
    ) {
      setIsValid(
        true
      );

      setMessage(
        "Stellar account accepted. AYZO intelligence is running."
      );

      setStellarAnalysis({
        address:
          value,
      });

      return;
    }

    if (
      network ===
        "ton"
    ) {
      setIsValid(
        true
      );

      setMessage(
        "TON address accepted. AYZO intelligence is running."
      );

      setTonAnalysis({
        address:
          value,
      });

      return;
    }

    if (
      network ===
        "xrp"
    ) {
      const detectionResponse =
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
          }
        );

      const detection =
        (
          await detectionResponse.json()
        ) as AddressDetectionResponse;

      if (
        !detectionResponse.ok ||
        !detection.ok ||
        detection.network !==
          "xrp"
      ) {
        setIsValid(
          false
        );

        setMessage(
          "This does not look like a valid XRP Ledger classic address."
        );

        return;
      }

      setIsValid(
        true
      );

      setMessage(
        "XRP Ledger address accepted. AYZO intelligence is running."
      );

      setXrpAnalysis({
        address:
          value,
      });

      return;
    }

    if (
      network ===
        "hedera"
    ) {
      const normalizedHedera =
        normalizeHederaAccountId(
          value
        );

      if (!normalizedHedera) {
        setIsValid(
          false
        );

        setMessage(
          "This does not look like a valid Hedera account ID."
        );

        return;
      }

      setIsValid(
        true
      );

      setMessage(
        "Hedera account accepted. AYZO intelligence is running."
      );

      setHederaAnalysis({
        address:
          normalizedHedera,
      });

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

    const isLitecoinAddressShape =
      LITECOIN_MAINNET_SHAPE.test(
        value
      );

    if (
      network ===
        "litecoin"
    ) {
      if (
        !isLitecoinAddressShape
      ) {
        setIsValid(false);

        setMessage(
          "This does not look like a valid Litecoin mainnet address."
        );

        return;
      }

      if (
        network !==
        "litecoin"
      ) {
        setNetwork(
          "litecoin"
        );
      }

      setIsValid(true);

      setMessage(
        "Litecoin address accepted. AYZO intelligence is running."
      );

      setLitecoinAnalysis({
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

    const isTronAddressShape =
      TRON_ADDRESS_SHAPE.test(
        value
      );

    if (
      network ===
        "tron" ||
      isTronAddressShape
    ) {
      const detectionResponse =
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
          }
        );

      if (!detectionResponse.ok) {
        setIsValid(false);

        setMessage(
          "Unable to verify this TRON address."
        );

        return;
      }

      const detection =
        (
          await detectionResponse.json()
        ) as AddressDetectionResponse;

      if (
        !detection.ok ||
        detection.network !==
          "tron"
      ) {
        setIsValid(false);

        setMessage(
          "This does not look like a valid TRON address."
        );

        return;
      }

      if (
        network !==
          "tron"
      ) {
        setNetwork(
          "tron"
        );
      }

      setIsValid(true);

      setMessage(
        network ===
          "tron"
          ? "TRON address accepted. AYZO intelligence is running."
          : "TRON address detected automatically. AYZO intelligence is running."
      );

      setTronAnalysis({
        address:
          value,
      });

      return;
    }

    const isSuiAddressShape =
      SUI_ADDRESS_SHAPE.test(
        value
      );

    const isDistinctSuiShape =
      isSuiAddressShape &&
      value.length !==
        42;

    if (
      isSuiAddressShape &&
      (
        network ===
          "sui" ||
        isDistinctSuiShape
      )
    ) {
      if (
        network !==
          "sui"
      ) {
        setNetwork(
          "sui"
        );
      }

      setIsValid(
        true
      );

      setMessage(
        network ===
          "sui"
          ? "Sui address accepted. AYZO intelligence is running."
          : "Sui address detected automatically. AYZO intelligence is running."
      );

      setSuiAnalysis({
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
      null ||
    litecoinAnalysis !==
      null ||
    suiAnalysis !==
      null ||
    tonAnalysis !==
      null ||
    stellarAnalysis !==
      null ||
    cardanoAnalysis !==
      null ||
    aptosAnalysis !==
      null ||
    hyperliquidAnalysis !==
      null ||
    tronAnalysis !==
      null ||
    xrpAnalysis !==
      null ||
    hederaAnalysis !==
      null ||
    finalFiveAnalysis !==
      null;

  useEffect(() => {
    if (!hasResult) {
      return;
    }

    const activeElement =
      document.activeElement;

    if (
      activeElement instanceof
      HTMLElement
    ) {
      activeElement.blur();
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          const target =
            document.getElementById(
              "analysis-result"
            );

          if (!target) {
            return;
          }

          const reduceMotion =
            window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches;

          const targetTop =
            Math.max(
              0,
              target.getBoundingClientRect()
                .top +
                window.scrollY -
                16
            );

          window.scrollTo({
            top:
              targetTop,

            behavior:
              reduceMotion
                ? "auto"
                : "smooth",
          });
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    hasResult,
    solanaResult,
    evmAnalysis,
    bitcoinAnalysis,
    dogecoinAnalysis,
    litecoinAnalysis,
    suiAnalysis,
    tonAnalysis,
    stellarAnalysis,
    cardanoAnalysis,
    aptosAnalysis,
    hyperliquidAnalysis,
    tronAnalysis,
    xrpAnalysis,
    hederaAnalysis,
    finalFiveAnalysis,
  ]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#0b1020] text-[#f3f6fc]">

      <AppResearchDesk
        network={network}
        liveNetworks={LIVE_NETWORKS}
        address={tokenAddress}
        loading={loading}
        isValid={isValid}
        message={message}
        accountControls={
          <HeaderAuthControls />
        }
        accessStatus={
          <FreePlanStatus
            network={network}
          />
        }
        onNetworkChange={
          selectNetwork
        }
        onAddressChange={
          value => {
            setTokenAddress(
              value
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
        onSubmit={
          handleAnalyze
        }
      />

      <section className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-2 pb-20 sm:px-4">
        {solanaResult && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center text-left">
            <AnalysisWorkspaceFrame>
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
              tokenSnapshot={
                solanaResult
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {evmAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <EvmIntelligenceReport
              key={`${evmAnalysis.network}:${evmAnalysis.address}`}
              address={
                evmAnalysis.address
              }
              network={
                evmAnalysis.network
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {bitcoinAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <BitcoinIntelligenceReport
              key={
                bitcoinAnalysis.address
              }
              address={
                bitcoinAnalysis.address
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {dogecoinAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <DogecoinIntelligenceReport
              key={
                dogecoinAnalysis.address
              }
              address={
                dogecoinAnalysis.address
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {litecoinAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <LitecoinIntelligenceReport
              key={
                litecoinAnalysis.address
              }
              address={
                litecoinAnalysis.address
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {suiAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <SuiIntelligenceReport
                key={
                  suiAnalysis.address
                }
                address={
                  suiAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {tonAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <TonIntelligenceReport
                key={
                  tonAnalysis.address
                }
                address={
                  tonAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {hyperliquidAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <HyperliquidIntelligenceReport
                key={
                  hyperliquidAnalysis.address
                }
                address={
                  hyperliquidAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {stellarAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <StellarIntelligenceReport
                key={
                  stellarAnalysis.address
                }
                address={
                  stellarAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {cardanoAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <CardanoIntelligenceReport
                key={
                  cardanoAnalysis.address
                }
                address={
                  cardanoAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {aptosAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <AptosIntelligenceReport
                key={
                  aptosAnalysis.address
                }
                address={
                  aptosAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {hederaAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              <HederaIntelligenceReport
                key={
                  hederaAnalysis.address
                }
                address={
                  hederaAnalysis.address
                }
              />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {tronAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <TronIntelligenceReport
              key={
                tronAnalysis.address
              }
              address={
                tronAnalysis.address
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {xrpAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center">
            <AnalysisWorkspaceFrame>
            <XrplIntelligenceReport
              key={
                xrpAnalysis.address
              }
              address={
                xrpAnalysis.address
              }
            />
            </AnalysisWorkspaceFrame>
          </section>
        )}

        {finalFiveAnalysis && (
          <section
            id="analysis-result"
            className="mt-12 scroll-mt-4 w-[calc(100vw-16px)] max-w-none shrink-0 self-center"
          >
            <AnalysisWorkspaceFrame>
              {finalFiveAnalysis.network ===
                "zcash" && (
                <ZcashIntelligenceReport
                  key={`zcash:${finalFiveAnalysis.address}`}
                  address={
                    finalFiveAnalysis.address
                  }
                />
              )}

              {finalFiveAnalysis.network ===
                "algorand" && (
                <AlgorandIntelligenceReport
                  key={`algorand:${finalFiveAnalysis.address}`}
                  address={
                    finalFiveAnalysis.address
                  }
                />
              )}

              {finalFiveAnalysis.network ===
                "polkadot" && (
                <PolkadotIntelligenceReport
                  key={`polkadot:${finalFiveAnalysis.address}`}
                  address={
                    finalFiveAnalysis.address
                  }
                />
              )}

              {finalFiveAnalysis.network ===
                "cosmos" && (
                <CosmosIntelligenceReport
                  key={`cosmos:${finalFiveAnalysis.address}`}
                  address={
                    finalFiveAnalysis.address
                  }
                />
              )}

              {finalFiveAnalysis.network ===
                "injective" && (
                <InjectiveIntelligenceReport
                  key={`injective:${finalFiveAnalysis.address}`}
                  address={
                    finalFiveAnalysis.address
                  }
                />
              )}
            </AnalysisWorkspaceFrame>
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
                  {LIVE_NETWORKS.length} networks
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

            <ExampleInvestigationGallery />
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
        id="ayzo-plans-access-trigger"
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
