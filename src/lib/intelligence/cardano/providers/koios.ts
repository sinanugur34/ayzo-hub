import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  isCardanoPaymentAddress,
} from "../address";

import type {
  CardanoEvidence,
  CardanoProviderResult,
} from "../types";

const DEFAULT_KOIOS_URL =
  "https://api.koios.rest/api/v1";

export type KoiosDependencies = {
  fetchImpl:
    typeof fetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  KoiosDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .CARDANO_KOIOS_URL
        ?.trim() ||
      DEFAULT_KOIOS_URL,

    timeoutMs:
      12_000,
  };

/*
 * Wave A keeps Koios as a bounded fallback boundary.
 *
 * Full normalization is deliberately isolated from
 * Blockfrost so provider-specific semantics never
 * leak into the shared engine.
 *
 * Until Koios normalization has its own fixture tests,
 * fallback reports upstream-unavailable instead of
 * fabricating Blockfrost-shaped evidence.
 */
export async function getCardanoKoiosEvidence(
  {
    address,
    analysisPlan: _analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  _deps:
    KoiosDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  CardanoProviderResult<
    CardanoEvidence
  >
> {
  if (
    !isCardanoPaymentAddress(
      address
    )
  ) {
    return {
      ok: false,
      providerId:
        "cardano-koios",
      latencyMs:
        0,
      code:
        "INVALID_ADDRESS",
      error:
        "Invalid Cardano mainnet payment address.",
    };
  }

  return {
    ok: false,
    providerId:
      "cardano-koios",
    latencyMs:
      null,
    code:
      "UPSTREAM_ERROR",
    error:
      "Koios deep normalization is not connected yet.",
  };
}
