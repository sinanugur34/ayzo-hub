import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type HyperliquidPositionEvidence = {
  coin:
    string;

  size:
    string;

  entryPrice:
    string | null;

  positionValue:
    string | null;

  unrealizedPnl:
    string | null;

  liquidationPrice:
    string | null;

  marginUsed:
    string | null;

  returnOnEquity:
    string | null;

  leverageType:
    string | null;

  leverageValue:
    number | null;

  cumulativeFundingAllTime:
    string | null;

  cumulativeFundingSinceOpen:
    string | null;
};

export type HyperliquidSpotBalanceEvidence = {
  coin:
    string;

  token:
    number | null;

  total:
    string;

  hold:
    string | null;

  entryNotional:
    string | null;
};

export type HyperliquidFillEvidence = {
  hash:
    string | null;

  transactionId:
    string;

  coin:
    string;

  price:
    string;

  size:
    string;

  side:
    string | null;

  direction:
    string | null;

  timestamp:
    string | null;

  closedPnl:
    string | null;

  fee:
    string | null;

  feeToken:
    string | null;

  crossed:
    boolean | null;
};

export type HyperliquidFundingPaymentEvidence = {
  hash:
    string | null;

  timestamp:
    string | null;

  coin:
    string | null;

  usdc:
    string | null;

  size:
    string | null;

  fundingRate:
    string | null;
};

export type HyperliquidLedgerEvidence = {
  hash:
    string | null;

  timestamp:
    string | null;

  type:
    string;

  usdc:
    string | null;

  amount:
    string | null;

  token:
    string | null;

  user:
    string | null;

  destination:
    string | null;

  fee:
    string | null;

  nativeTokenFee:
    string | null;

  feeToken:
    string | null;

  toPerp:
    boolean | null;

  vault:
    string | null;

  requestedUsd:
    string | null;

  sourceDex:
    string | null;

  destinationDex:
    string | null;
};

export type HyperliquidPortfolioWindow = {
  window:
    string;

  volume:
    string | null;

  accountValueHistory:
    readonly {
      timestamp:
        string;

      value:
        string;
    }[];

  pnlHistory:
    readonly {
      timestamp:
        string;

      value:
        string;
    }[];
};

export type HyperliquidEvidence = {
  hyperCore: {
    role:
      string | null;

    accountValue:
      string | null;

    withdrawable:
      string | null;

    totalNotionalPosition:
      string | null;

    totalMarginUsed:
      string | null;

    positions:
      readonly HyperliquidPositionEvidence[];

    spotBalances:
      readonly HyperliquidSpotBalanceEvidence[];

    fills:
      readonly HyperliquidFillEvidence[];

    fundingPayments:
      readonly HyperliquidFundingPaymentEvidence[];

    portfolio:
      readonly HyperliquidPortfolioWindow[];

    nonFundingLedger:
      readonly HyperliquidLedgerEvidence[];
  };

  hyperEvm: {
    chainId:
      999;

    nativeCurrency:
      "HYPE";

    balanceWei:
      string;

    transactionCount:
      number;

    code:
      string;

    isContract:
      boolean;
  };

  coverage: {
    plan:
      AnalysisDepthPlan;

    fillLimit:
      number;

    fundingLimit:
      number;

    fundingLookbackDays:
      number;

    positionLimit:
      number;

    spotBalanceLimit:
      number;

    portfolioPointLimit:
      number;

    ledgerLimit:
      number;

    ledgerLookbackDays:
      number;

    hyperCoreProvider:
      "hyperliquid-info";

    hyperEvmProvider:
      "hyperliquid-json-rpc";
  };
};

export type HyperliquidProviderResult =
  | {
      ok:
        true;

      latencyMs:
        number;

      data:
        HyperliquidEvidence;
    }
  | {
      ok:
        false;

      latencyMs:
        number | null;

      code:
        | "INVALID_ADDRESS"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "CHAIN_ID_MISMATCH"
        | "UPSTREAM_ERROR";

      error:
        string;
    };
