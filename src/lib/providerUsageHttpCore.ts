import type {
  ProviderUsageOutcome,
} from "./providerUsageTelemetryCore";

import {
  captureProviderUsageCore,
  readProviderUsageHintsCore,
} from "./providerUsageScopeCore";

import {
  resolveProviderUsagePricing,
} from "./providerUsagePricingCore";

export type ProviderUsageHttpResponse = {
  readonly ok:
    boolean;

  readonly status:
    number;
};

export type ProviderUsageHttpInput = {
  provider?:
    string;

  operation:
    string;

  attempt?:
    number;

  estimatedUnits?:
    number;

  metadata?:
    Readonly<
      Record<
        string,
        string |
        number |
        boolean |
        null
      >
    >;
};

function requestUrl(
  request:
    unknown
): string | null {
  if (
    typeof request ===
      "string"
  ) {
    return request;
  }

  if (
    request instanceof
      URL
  ) {
    return request.toString();
  }

  if (
    typeof Request !==
      "undefined" &&
    request instanceof
      Request
  ) {
    return request.url;
  }

  return null;
}

function inferProvider(
  request:
    unknown
): string {
  const raw =
    requestUrl(
      request
    );

  if (!raw) {
    return "http-upstream";
  }

  let host:
    string;

  try {
    host =
      new URL(
        raw
      )
        .hostname
        .toLowerCase();
  } catch {
    return "http-upstream";
  }

  const rules:
    readonly [
      string,
      string
    ][] = [
      ["alchemy.com", "alchemy"],
      ["covalenthq.com", "goldrush"],
      ["mempool.space", "mempool"],
      ["blockchair.com", "blockchair"],
      ["blockcypher.com", "blockcypher"],
      ["etherscan", "etherscan"],
      ["trongrid", "trongrid"],
      ["blockfrost", "cardano-blockfrost"],
      ["koios", "cardano-koios"],
      ["nodely", "nodely"],
      ["algonode", "algonode"],
      ["nearblocks", "near-nearblocks"],
      ["near.org", "near-rpc"],
      ["subscan", "subscan"],
      ["pubfi", "pubfi"],
      ["nownodes", "nownodes"],
      ["quicknode", "quicknode"],
      ["hgraph", "hedera-hgraph"],
      ["hedera.com", "hedera-mirror-public"],
      ["toncenter", "toncenter-v3"],
      ["stellar.org", "stellar-horizon"],
      ["sui.io", "sui-graphql"],
      ["aptoslabs", "aptos-labs"],
      ["hyperliquid", "hyperliquid"],
      ["injective", "injective"],
    ];

  for (
    const [
      needle,
      provider
    ] of rules
  ) {
    if (
      host.includes(
        needle
      )
    ) {
      return provider;
    }
  }

  if (
    host.includes(
      "ripple.com"
    ) ||
    host.includes(
      "xrpl"
    )
  ) {
    return "xrpl-public";
  }

  return "http-upstream";
}

function responseOutcome(
  status:
    number
): ProviderUsageOutcome {
  if (status === 429) {
    return "rate_limited";
  }

  if (
    status === 408 ||
    status === 504
  ) {
    return "timeout";
  }

  if (
    status >= 200 &&
    status < 400
  ) {
    return "success";
  }

  return "upstream_error";
}

function exceptionOutcome(
  error:
    unknown
): ProviderUsageOutcome {
  if (
    error instanceof Error &&
    (
      error.name ===
        "AbortError" ||
      error.name ===
        "TimeoutError"
    )
  ) {
    return "timeout";
  }

  return "unavailable";
}

/*
 * One invocation = one physical outbound attempt.
 *
 * The request URL may be inspected transiently for
 * provider classification but is never persisted.
 */
export async function providerUsageFetch<
  T extends
    ProviderUsageHttpResponse
>(
  input:
    ProviderUsageHttpInput,

  request:
    unknown,

  callback:
    () => Promise<T>
): Promise<T> {
  const startedAt =
    performance.now();

  const hints =
    readProviderUsageHintsCore();

  const provider =
    input.provider
      ?.trim() ||
    inferProvider(
      request
    );

  const pricing =
    resolveProviderUsagePricing({
      provider,

      operation:
        input.operation,
    });

  try {
    const response =
      await callback();

    captureProviderUsageCore({
      provider,

      operation:
        input.operation,

      outcome:
        responseOutcome(
          response.status
        ),

      latencyMs:
        Math.max(
          0,
          Math.round(
            performance.now() -
              startedAt
          )
        ),

      httpStatus:
        response.status,

      errorCode:
        response.ok
          ? null
          : `HTTP_${response.status}`,

      attempt:
        input.attempt ??
        hints?.attempt ??
        1,

      fallbackUsed:
        hints?.fallbackUsed ===
        true,

      cacheHit:
        false,

      estimatedUnits:
        input.estimatedUnits ??
        1,

      metadata: {
        ...input.metadata,

        native_unit_kind:
          pricing.nativeUnitKind,

        native_units:
          pricing.nativeUnits,

        estimated_public_cost_usd:
          pricing.estimatedPublicCostUsd,

        cost_basis:
          pricing.costBasis,

        pricing_status:
          pricing.pricingStatus,

        pricing_version:
          pricing.pricingVersion,

        event_kind:
          "physical_http",

        transport:
          "http",
      },
    });

    return response;
  } catch (
    error
  ) {
    captureProviderUsageCore({
      provider,

      operation:
        input.operation,

      outcome:
        exceptionOutcome(
          error
        ),

      latencyMs:
        Math.max(
          0,
          Math.round(
            performance.now() -
              startedAt
          )
        ),

      httpStatus:
        null,

      errorCode:
        error instanceof Error
          ? error.name
          : "UNKNOWN",

      attempt:
        input.attempt ??
        hints?.attempt ??
        1,

      fallbackUsed:
        hints?.fallbackUsed ===
        true,

      cacheHit:
        false,

      estimatedUnits:
        input.estimatedUnits ??
        1,

      metadata: {
        ...input.metadata,

        native_unit_kind:
          pricing.nativeUnitKind,

        native_units:
          pricing.nativeUnits,

        estimated_public_cost_usd:
          pricing.estimatedPublicCostUsd,

        cost_basis:
          pricing.costBasis,

        pricing_status:
          pricing.pricingStatus,

        pricing_version:
          pricing.pricingVersion,

        event_kind:
          "physical_http",

        transport:
          "http",
      },
    });

    throw error;
  }
}
