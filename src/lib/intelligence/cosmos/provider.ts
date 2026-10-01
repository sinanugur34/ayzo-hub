import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  loadCosmosSdkEvidence,
  type CosmosSdkProviderResult,
} from "@/lib/intelligence/cosmosSdk";

import {
  normalizeCosmosAddress,
} from "./address";

const DEFAULT_REST =
  "https://rest.cosmos.directory/cosmoshub";

const DEFAULT_FALLBACK =
  "https://cosmos-api.polkachu.com";

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

export async function getCosmosHubEvidence(
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
        "cosmos",

      address,
      analysisPlan,

      validator:
        normalizeCosmosAddress,

      providerId:
        "cosmos-sdk-rest",

      baseUrls:
        deps.baseUrls ??
        unique([
          process.env
            .COSMOS_REST_URL,

          DEFAULT_REST,

          process.env
            .COSMOS_REST_FALLBACK_URL,

          DEFAULT_FALLBACK,
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
