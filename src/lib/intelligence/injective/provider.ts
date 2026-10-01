import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  loadCosmosSdkEvidence,
  type CosmosSdkProviderResult,
} from "@/lib/intelligence/cosmosSdk";

import {
  normalizeInjectiveAddress,
} from "./address";

const DEFAULT_REST =
  "https://sentry.lcd.injective.network";

function unique(
  values:
    readonly (
      string |
      undefined
    )[]
) {
  return [
    ...new Set(
      values
        .map(
          item =>
            item?.trim()
        )
        .filter(
          (
            item
          ): item is string =>
            Boolean(item)
        )
    ),
  ];
}

export async function getInjectiveEvidence(
  {
    address,
    analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps: {
    fetchImpl?:
      NonNullable<
        Parameters<
          typeof loadCosmosSdkEvidence
        >[1]
      >["fetchImpl"];

    timeoutMs?:
      number;

    baseUrls?:
      readonly string[];
  } = {}
): Promise<
  CosmosSdkProviderResult
> {
  return loadCosmosSdkEvidence(
    {
      network:
        "injective",

      address,
      analysisPlan,

      validator:
        normalizeInjectiveAddress,

      providerId:
        "injective-cosmos-rest",

      baseUrls:
        deps.baseUrls ??
        unique([
          process.env
            .INJECTIVE_REST_URL,

          DEFAULT_REST,

          process.env
            .INJECTIVE_REST_FALLBACK_URL,
        ]),
    },
    {
      fetchImpl:
        deps.fetchImpl,

      timeoutMs:
        deps.timeoutMs,
    }
  );
}
