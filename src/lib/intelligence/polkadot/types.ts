import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type PolkadotProviderId =
  | "polkadot-sidecar"
  | "polkadot-sidecar-pubfi"
  | "polkadot-sidecar-subscan";

export type PolkadotProviderErrorCode =
  | "INVALID_ADDRESS"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_RESPONSE";

export type PolkadotProviderResult<T> =
  | {
      ok:
        true;

      providerId:
        PolkadotProviderId;

      latencyMs:
        number;

      data:
        T;
    }
  | {
      ok:
        false;

      providerId:
        PolkadotProviderId;

      latencyMs:
        number | null;

      code:
        PolkadotProviderErrorCode;

      error:
        string;
    };

export type PolkadotAccountState = {
  nonce:
    string | null;

  tokenSymbol:
    string | null;

  freePlanck:
    string | null;

  reservedPlanck:
    string | null;

  frozenPlanck:
    string | null;

  transferablePlanck:
    string | null;

  blockHeight:
    number | null;

  blockHash:
    string | null;
};

export type PolkadotTransferEvidence = {
  from:
    string | null;

  to:
    string | null;

  amountPlanck:
    string | null;

  blockNumber:
    number | null;

  timestamp:
    string | null;

  extrinsicIndex:
    string | null;

  extrinsicHash:
    string | null;

  success:
    boolean | null;
};

export type PolkadotExtrinsicEvidence = {
  module:
    string | null;

  call:
    string | null;

  blockNumber:
    number | null;

  timestamp:
    string | null;

  extrinsicIndex:
    string | null;

  extrinsicHash:
    string | null;

  success:
    boolean | null;

  feePlanck:
    string | null;
};

export type PolkadotStakingEvidence = {
  status:
    string | null;

  bondedPlanck:
    string | null;

  stashAddress:
    string | null;

  controllerAddress:
    string | null;

  rewardAddress:
    string | null;
};

export type PolkadotProxyEvidence = {
  account:
    string | null;

  realAccount:
    string | null;

  module:
    string | null;

  call:
    string | null;

  extrinsicIndex:
    string | null;

  timestamp:
    string | null;
};

export type PolkadotMultisigEvidence = {
  multiId:
    string | null;

  account:
    string | null;

  multisigAccount:
    string | null;

  status:
    string | null;

  extrinsicIndex:
    string | null;

  timestamp:
    string | null;
};

export type PolkadotEvidence = {
  network:
    "polkadot";

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  account:
    PolkadotAccountState;

  transfers:
    readonly PolkadotTransferEvidence[];

  extrinsics:
    readonly PolkadotExtrinsicEvidence[];

  staking:
    PolkadotStakingEvidence | null;

  proxies:
    readonly PolkadotProxyEvidence[];

  multisig:
    readonly PolkadotMultisigEvidence[];

  coverage: {
    plan:
      AnalysisDepthPlan;

    transferLimit:
      number;

    extrinsicLimit:
      number;

    proxyLimit:
      number;

    multisigLimit:
      number;

    providerRequestBudget:
      number;

    providerRequestsUsed:
      number;

    indexedProviderConfigured:
      boolean;

    unavailableEvidence:
      readonly string[];

    coverage:
      "complete" |
      "partial";
  };
};
