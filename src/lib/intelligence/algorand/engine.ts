import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeAlgorandAddress,
} from "./address";

export type AlgorandEngineFailure = {
  ok: false;
  network: "algorand";
  code:
    | "INVALID_ADDRESS"
    | "PROVIDER_NOT_CONFIGURED";
  error: string;
};

export async function runAlgorandIntelligence({
  address,
  analysisPlan = "free",
}: {
  address: string;
  analysisPlan?: AnalysisDepthPlan;
}): Promise<AlgorandEngineFailure> {
  void analysisPlan;

  const normalized =
    normalizeAlgorandAddress(
      address
    );

  if (!normalized) {
    return {
      ok: false,
      network: "algorand",
      code: "INVALID_ADDRESS",
      error:
        "Invalid Algorand account address.",
    };
  }

  return {
    ok: false,
    network: "algorand",
    code: "PROVIDER_NOT_CONFIGURED",
    error:
      "Algorand Deep Analyze provider acceptance is not complete.",
  };
}
