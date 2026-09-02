import type {
  QualityCheckResult,
} from "./types";

import type {
  EvmProviderResult,
  EvmContractVerification,
} from "@/lib/intelligence/evm/types";

export function buildEvmVerificationChecks(
  result: EvmProviderResult<EvmContractVerification>
): readonly QualityCheckResult[] {
  if (!result.ok) {
    return [
      {
        id: "providerConnectivity",
        status:
          result.code === "TIMEOUT" ||
          result.code === "RATE_LIMITED" ||
          result.code === "UPSTREAM_ERROR"
            ? "fail"
            : "not-run",
        message: result.error,
        durationMs: result.latencyMs,
      },
      {
        id: "assetVerification",
        status: "fail",
        message: result.error,
        durationMs: result.latencyMs,
      },
    ];
  }

  return [
    {
      id: "providerConnectivity",
      status: "pass",
      message: null,
      durationMs: result.latencyMs,
    },
    {
      id: "addressValidation",
      status: "pass",
      message: null,
      durationMs: null,
    },
    {
      id: "assetVerification",
      status:
        result.data.isContract
          ? "pass"
          : "fail",
      message:
        result.data.isContract
          ? null
          : "Address has no deployed contract code.",
      durationMs: result.latencyMs,
    },
  ];
}
