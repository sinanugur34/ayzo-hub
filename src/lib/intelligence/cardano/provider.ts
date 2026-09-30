import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  getCardanoBlockfrostEvidence,
} from "./providers/blockfrost";

import {
  getCardanoKoiosEvidence,
} from "./providers/koios";

import type {
  CardanoEvidence,
  CardanoProviderErrorCode,
  CardanoProviderResult,
} from "./types";

export type CardanoEvidenceLoader = (
  input: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  }
) => Promise<
  CardanoProviderResult<
    CardanoEvidence
  >
>;

export type CardanoFallbackDependencies = {
  primary:
    CardanoEvidenceLoader;

  fallback:
    CardanoEvidenceLoader;
};

const DEFAULT_DEPENDENCIES:
  CardanoFallbackDependencies = {
    primary:
      getCardanoBlockfrostEvidence,

    fallback:
      getCardanoKoiosEvidence,
  };

function shouldFallback(
  code:
    CardanoProviderErrorCode
) {
  return (
    code ===
      "RATE_LIMITED" ||
    code ===
      "TIMEOUT" ||
    code ===
      "UPSTREAM_ERROR" ||
    code ===
      "MALFORMED_RESPONSE"
  );
}

export async function getCardanoEvidence(
  input: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    CardanoFallbackDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  CardanoProviderResult<
    CardanoEvidence
  >
> {
  const primary =
    await deps.primary(
      input
    );

  if (primary.ok) {
    return primary;
  }

  if (
    !shouldFallback(
      primary.code
    )
  ) {
    return primary;
  }

  const fallback =
    await deps.fallback(
      input
    );

  if (!fallback.ok) {
    return primary;
  }

  return {
    ...fallback,
    data: {
      ...fallback.data,
      coverage: {
        ...fallback
          .data
          .coverage,
        primaryProvider:
          primary.providerId,
        fallbackProvider:
          fallback.providerId,
        fallbackUsed:
          true,
      },
    },
  };
}
