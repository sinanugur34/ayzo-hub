import type { NetworkId } from "@/lib/networks/registry";
import type { NetworkCapability } from "@/lib/networks/types";
import type {
  ProviderHealthSnapshot,
} from "@/lib/providers/types";

export type DiagnosticStatus =
  | "pass"
  | "fail"
  | "limited"
  | "not-run";

export type NetworkRuntimeStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export const QUALITY_CHECK_IDS = [
  "providerConnectivity",
  "addressValidation",
  "assetVerification",
  "holderIntelligence",
  "walletRelationships",
  "fundingIntelligence",
  "fundingProvenance",
  "developerHistory",
  "limitedCoverage",
  "providerFallback",
  "rateLimit",
  "cache",
] as const;

export type QualityCheckId =
  (typeof QUALITY_CHECK_IDS)[number];

export type QualityCheckResult = {
  id: QualityCheckId;
  status: DiagnosticStatus;
  message: string | null;
  durationMs: number | null;
};

export type QualityGateResult = {
  status: "pass" | "fail";
  requiredChecks: readonly QualityCheckId[];
  passedChecks: readonly QualityCheckId[];
  failedChecks: readonly QualityCheckId[];
};

export type CapabilityDiagnostic = {
  capability: NetworkCapability;
  status: DiagnosticStatus;
  message: string | null;
};

export type NetworkDiagnosticSnapshot = {
  networkId: NetworkId;
  observedAt: string;
  status: NetworkRuntimeStatus;
  latencyMs: number | null;
  providers: readonly ProviderHealthSnapshot[];
  capabilities: readonly CapabilityDiagnostic[];
  qualityGate: QualityGateResult;
};
