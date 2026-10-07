export type ProviderUsageNativeUnitKind =
  | "request"
  | "credit"
  | "compute_unit";

export type ProviderUsagePricingStatus =
  | "verified_public"
  | "request_only"
  | "dynamic_unresolved"
  | "public_reference_conflict";

export type ProviderUsageCostBasis =
  | "public_payg_equivalent"
  | "public_overage_equivalent"
  | "unavailable";

export type ProviderUsagePricingEstimate = {
  nativeUnitKind:
    ProviderUsageNativeUnitKind;

  nativeUnits:
    number |
    null;

  estimatedPublicCostUsd:
    number |
    null;

  costBasis:
    ProviderUsageCostBasis;

  pricingStatus:
    ProviderUsagePricingStatus;

  pricingVersion:
    string;
};

/*
 * Public pricing reference snapshot:
 * 2026-10-07.
 *
 * IMPORTANT:
 *
 * This registry does NOT calculate an AYZO
 * provider invoice.
 *
 * It estimates a public PAYG / overage
 * equivalent only when the provider publishes
 * enough information to calculate one safely.
 *
 * Included plan allowances, prepaid credits,
 * enterprise agreements and negotiated pricing
 * can make actual billed marginal cost different.
 */

const
  ALCHEMY_PUBLIC_USD_PER_MILLION_CU =
    0.525;

const
  HELIUS_PUBLIC_USD_PER_MILLION_CREDITS =
    5;

function boundedMoney(
  value:
    number
): number {
  return Number(
    value.toFixed(
      12
    )
  );
}

function requestOnly(
  version:
    string
): ProviderUsagePricingEstimate {
  return {
    nativeUnitKind:
      "request",

    nativeUnits:
      1,

    estimatedPublicCostUsd:
      null,

    costBasis:
      "unavailable",

    pricingStatus:
      "request_only",

    pricingVersion:
      version,
  };
}

function alchemyComputeUnits(
  operation:
    string
): number | null {
  /*
   * AYZO transaction-history adapter uses
   * alchemy_getAssetTransfers.
   */
  if (
    operation ===
      "evm.transactions" ||
    operation ===
      "evm.transfers"
  ) {
    return 120;
  }

  /*
   * AYZO Bitcoin/Dogecoin/Litecoin canonical
   * transaction adapters use getrawtransaction.
   */
  if (
    operation ===
      "bitcoin.rpc.getrawtransaction" ||
    operation ===
      "dogecoin.getrawtransaction" ||
    operation ===
      "litecoin.getrawtransaction"
  ) {
    return 10;
  }

  const prefix =
    "evm.rpc.";

  if (
    !operation.startsWith(
      prefix
    )
  ) {
    return null;
  }

  const method =
    operation.slice(
      prefix.length
    );

  switch (method) {
    case "eth_blockNumber":
      return 10;

    case "eth_getCode":
      return 20;

    case "eth_getBlockByNumber":
      return 20;

    case "eth_getTransactionByHash":
      return 20;

    case "eth_getTransactionReceipt":
      return 20;

    case "eth_getBalance":
      return 20;

    case "eth_call":
      return 26;

    case "eth_getLogs":
      return 60;

    case "alchemy_getAssetTransfers":
      return 120;

    default:
      /*
       * Unknown Alchemy methods stay request-only.
       * We never invent CU consumption.
       */
      return null;
  }
}

function alchemyPricing(
  operation:
    string
): ProviderUsagePricingEstimate {
  const units =
    alchemyComputeUnits(
      operation
    );

  if (
    units ===
      null
  ) {
    return requestOnly(
      "alchemy-public-2026-10-07"
    );
  }

  return {
    nativeUnitKind:
      "compute_unit",

    nativeUnits:
      units,

    estimatedPublicCostUsd:
      boundedMoney(
        units *
          (
            ALCHEMY_PUBLIC_USD_PER_MILLION_CU /
            1_000_000
          )
      ),

    costBasis:
      "public_payg_equivalent",

    pricingStatus:
      "verified_public",

    pricingVersion:
      "alchemy-public-2026-10-07",
  };
}

function heliusPricing(
  operation:
    string
): ProviderUsagePricingEstimate {
  const prefix =
    "solana.rpc.";

  if (
    !operation.startsWith(
      prefix
    )
  ) {
    return requestOnly(
      "helius-public-2026-10-07"
    );
  }

  const method =
    operation.slice(
      prefix.length
    );

  /*
   * Current public Helius references disagree
   * on exact getTransactionsForAddress credit
   * consumption.
   *
   * AYZO deliberately leaves it unresolved
   * instead of presenting a false precise cost.
   */
  if (
    method ===
      "getTransactionsForAddress"
  ) {
    return {
      nativeUnitKind:
        "credit",

      nativeUnits:
        null,

      estimatedPublicCostUsd:
        null,

      costBasis:
        "unavailable",

      pricingStatus:
        "public_reference_conflict",

      pricingVersion:
        "helius-public-2026-10-07",
    };
  }

  /*
   * Methods actually used by the current AYZO
   * Solana pipeline.
   */
  const standardMethods =
    new Set([
      "getTokenSupply",
      "getTokenLargestAccounts",
      "getMultipleAccounts",
    ]);

  const archivalMethods =
    new Set([
      "getSignaturesForAddress",
      "getTransaction",
    ]);

  let credits:
    number |
    null =
      null;

  if (
    standardMethods.has(
      method
    )
  ) {
    credits =
      1;
  }

  if (
    archivalMethods.has(
      method
    )
  ) {
    credits =
      10;
  }

  if (
    credits ===
      null
  ) {
    return requestOnly(
      "helius-public-2026-10-07"
    );
  }

  return {
    nativeUnitKind:
      "credit",

    nativeUnits:
      credits,

    estimatedPublicCostUsd:
      boundedMoney(
        credits *
          (
            HELIUS_PUBLIC_USD_PER_MILLION_CREDITS /
            1_000_000
          )
      ),

    costBasis:
      "public_overage_equivalent",

    pricingStatus:
      "verified_public",

    pricingVersion:
      "helius-public-2026-10-07",
  };
}

function goldRushPricing():
  ProviderUsagePricingEstimate {
  /*
   * GoldRush credit usage can depend on returned
   * items and the account's pricing model.
   *
   * One physical request therefore cannot safely
   * be converted to a fixed credit quantity here.
   */
  return {
    nativeUnitKind:
      "credit",

    nativeUnits:
      null,

    estimatedPublicCostUsd:
      null,

    costBasis:
      "unavailable",

    pricingStatus:
      "dynamic_unresolved",

    pricingVersion:
      "goldrush-public-2026-10-07",
  };
}

export function resolveProviderUsagePricing(
  input: {
    provider:
      string;

    operation:
      string;
  }
): ProviderUsagePricingEstimate {
  const provider =
    input.provider
      .trim()
      .toLowerCase();

  const operation =
    input.operation
      .trim();

  if (
    provider ===
      "alchemy"
  ) {
    return alchemyPricing(
      operation
    );
  }

  if (
    provider ===
      "helius"
  ) {
    return heliusPricing(
      operation
    );
  }

  if (
    provider ===
      "goldrush"
  ) {
    return goldRushPricing();
  }

  return requestOnly(
    "request-only-2026-10-07"
  );
}
