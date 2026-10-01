import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  isZcashShieldedOrUnifiedAddress,
  normalizeZcashTransparentAddress,
} from "./address";

export type ZcashEngineFailure = {
  ok: false;
  network: "zcash";
  code:
    | "INVALID_ADDRESS"
    | "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE"
    | "PROVIDER_NOT_CONFIGURED";
  error: string;
};

export async function runZcashIntelligence({
  address,
  analysisPlan = "free",
}: {
  address: string;
  analysisPlan?: AnalysisDepthPlan;
}): Promise<ZcashEngineFailure> {
  void analysisPlan;

  if (
    isZcashShieldedOrUnifiedAddress(
      address
    )
  ) {
    return {
      ok: false,
      network: "zcash",
      code:
        "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE",
      error:
        "Zcash shielded sender, recipient and amount evidence is not publicly traceable from the address alone.",
    };
  }

  const normalized =
    normalizeZcashTransparentAddress(
      address
    );

  if (!normalized) {
    return {
      ok: false,
      network: "zcash",
      code: "INVALID_ADDRESS",
      error:
        "Invalid Zcash transparent mainnet address.",
    };
  }

  return {
    ok: false,
    network: "zcash",
    code: "PROVIDER_NOT_CONFIGURED",
    error:
      "Zcash Deep Analyze provider acceptance is not complete.",
  };
}
