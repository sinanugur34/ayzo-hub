import type { NetworkFamily } from "@/lib/networks/types";
import type { NetworkId } from "@/lib/networks/registry";

export type IntelligenceCoverage =
  | "full"
  | "partial"
  | "limited";

export type IntelligenceModuleStatus =
  | "complete"
  | "limited"
  | "not-run"
  | "unavailable";

export type IntelligenceErrorCode =
  | "INVALID_NETWORK"
  | "NETWORK_NOT_AVAILABLE"
  | "INVALID_ADDRESS"
  | "RATE_LIMITED"
  | "DAILY_FREE_LIMIT"
  | "DAILY_PRO_LIMIT"
  | "UPSTREAM_ERROR";

export type IntelligenceRequest = {
  network: NetworkId;
  address: string;
};

export type IntelligenceNetworkContext = {
  id: NetworkId;
  name: string;
  family: NetworkFamily;
  chainId: number | null;
  nativeCurrency: string;
};

export type IntelligenceModuleState = {
  status: IntelligenceModuleStatus;
  error: string | null;
};

export type IntelligenceFinding = {
  id: string;
  category: string;
  title: string;
  severity: "attention" | "informational";
  confidence: "low" | "medium" | "high";
  summary: string;
  caveat: string;
};

export type IntelligenceErrorResponse = {
  ok: false;
  code: IntelligenceErrorCode;
  error: string;
  network?: NetworkId;
};

export type IntelligenceEngineResult<
  TData = Record<string, unknown>,
> = {
  status: number;
  data: TData;
};
