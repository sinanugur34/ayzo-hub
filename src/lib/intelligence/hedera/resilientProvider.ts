import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  getHederaMirrorEvidence,
} from "./provider";

import {
  getHederaFallbackProvider,
  getHederaPrimaryProvider,
} from "./providerConfig";

import type {
  HederaMirrorEvidence,
  HederaProviderResult,
} from "./types";

const FALLBACK_CODES =
  new Set([
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_ERROR",
    "MALFORMED_RESPONSE",
  ]);

export async function getResilientHederaMirrorEvidence({
  accountId,
  analysisPlan,
}: {
  accountId:
    string;

  analysisPlan:
    AnalysisDepthPlan;
}): Promise<
  HederaProviderResult<
    HederaMirrorEvidence
  >
> {
  const primary =
    getHederaPrimaryProvider();

  const primaryResult =
    await getHederaMirrorEvidence(
      {
        accountId,
        analysisPlan,
      },
      {
        fetchImpl:
          fetch,

        baseUrl:
          primary.baseUrl,

        timeoutMs:
          12_000,

        apiKey:
          primary.apiKey,

        providerId:
          primary.id,
      }
    );

  if (
    primaryResult.ok ||
    !FALLBACK_CODES.has(
      primaryResult.code
    )
  ) {
    return primaryResult;
  }

  const fallback =
    getHederaFallbackProvider();

  if (!fallback) {
    return primaryResult;
  }

  return getHederaMirrorEvidence(
    {
      accountId,
      analysisPlan,
    },
    {
      fetchImpl:
        fetch,

      baseUrl:
        fallback.baseUrl,

      timeoutMs:
        12_000,

      apiKey:
        fallback.apiKey,

      providerId:
        fallback.id,
    }
  );
}
