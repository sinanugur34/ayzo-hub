import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeHyperliquidAddress,
} from "./address";

import {
  getHyperliquidAnalysisPolicy,
} from "./policy";

import type {
  HyperliquidEvidence,
  HyperliquidFillEvidence,
  HyperliquidFundingPaymentEvidence,
  HyperliquidLedgerEvidence,
  HyperliquidPortfolioWindow,
  HyperliquidPositionEvidence,
  HyperliquidProviderResult,
  HyperliquidSpotBalanceEvidence,
} from "./types";

const HYPERCORE_INFO_URL =
  "https://api.hyperliquid.xyz/info";

const HYPEREVM_RPC_URL =
  "https://rpc.hyperliquid.xyz/evm";

type JsonRecord =
  Record<string, unknown>;

export type HyperliquidFetch =
  (
    input:
      string,
    init?:
      RequestInit
  ) =>
    Promise<{
      ok:
        boolean;

      status:
        number;

      json():
        Promise<unknown>;
    }>;

export type HyperliquidProviderDependencies = {
  fetchImpl:
    HyperliquidFetch;

  infoUrl:
    string;

  evmRpcUrl:
    string;

  timeoutMs:
    number;

  now():
    number;
};

const DEFAULT_DEPENDENCIES:
  HyperliquidProviderDependencies = {
    fetchImpl:
      fetch,

    infoUrl:
      process.env
        .HYPERLIQUID_INFO_URL
        ?.trim() ||
      HYPERCORE_INFO_URL,

    evmRpcUrl:
      process.env
        .HYPERLIQUID_EVM_RPC_URL
        ?.trim() ||
      HYPEREVM_RPC_URL,

    timeoutMs:
      12_000,

    now:
      Date.now,
  };

function record(
  value:
    unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  )
    ? value as JsonRecord
    : null;
}

function array(
  value:
    unknown
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function text(
  value:
    unknown
) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return String(
      value
    );
  }

  return null;
}

function numberValue(
  value:
    unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function booleanValue(
  value:
    unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function timestampMs(
  value:
    unknown
) {
  const numeric =
    typeof value ===
      "number"
      ? value
      : typeof value ===
          "string"
        ? Number(
            value
          )
        : NaN;

  if (
    !Number.isFinite(
      numeric
    ) ||
    numeric <=
      0
  ) {
    return null;
  }

  return new Date(
    numeric
  ).toISOString();
}

function hexQuantityToNumber(
  value:
    unknown
) {
  if (
    typeof value !==
      "string" ||
    !/^0x[0-9a-fA-F]+$/.test(
      value
    )
  ) {
    return null;
  }

  const numeric =
    Number.parseInt(
      value.slice(
        2
      ),
      16
    );

  return Number.isSafeInteger(
    numeric
  )
    ? numeric
    : null;
}

function parsePositions(
  state:
    JsonRecord | null,
  limit:
    number
): HyperliquidPositionEvidence[] {
  return array(
    state
      ?.assetPositions
  )
    .map(
      record
    )
    .map(
      row =>
        record(
          row?.position
        )
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const coin =
          text(
            row.coin
          );

        const size =
          text(
            row.szi
          );

        if (
          !coin ||
          !size
        ) {
          return [];
        }

        const leverage =
          record(
            row.leverage
          );

        const cumulativeFunding =
          record(
            row.cumFunding
          );

        return [
          {
            coin,

            size,

            entryPrice:
              text(
                row.entryPx
              ),

            positionValue:
              text(
                row.positionValue
              ),

            unrealizedPnl:
              text(
                row.unrealizedPnl
              ),

            liquidationPrice:
              text(
                row.liquidationPx
              ),

            marginUsed:
              text(
                row.marginUsed
              ),

            returnOnEquity:
              text(
                row.returnOnEquity
              ),

            leverageType:
              text(
                leverage?.type
              ),

            leverageValue:
              numberValue(
                leverage?.value
              ),

            cumulativeFundingAllTime:
              text(
                cumulativeFunding
                  ?.allTime
              ),

            cumulativeFundingSinceOpen:
              text(
                cumulativeFunding
                  ?.sinceOpen
              ),
          },
        ];
      }
    )
    .slice(
      0,
      limit
    );
}

function parseSpotBalances(
  state:
    JsonRecord | null,
  limit:
    number
): HyperliquidSpotBalanceEvidence[] {
  return array(
    state?.balances
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const coin =
          text(
            row.coin
          );

        const total =
          text(
            row.total
          );

        if (
          !coin ||
          total === null
        ) {
          return [];
        }

        return [
          {
            coin,

            token:
              numberValue(
                row.token
              ),

            total,

            hold:
              text(
                row.hold
              ),

            entryNotional:
              text(
                row.entryNtl
              ),
          },
        ];
      }
    )
    .slice(
      0,
      limit
    );
}

function parseFills(
  value:
    unknown,
  limit:
    number
): HyperliquidFillEvidence[] {
  return array(
    value
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const coin =
          text(
            row.coin
          );

        const px =
          text(
            row.px
          );

        const size =
          text(
            row.sz
          );

        const tid =
          text(
            row.tid
          );

        if (
          !coin ||
          !px ||
          !size ||
          !tid
        ) {
          return [];
        }

        return [
          {
            hash:
              text(
                row.hash
              ),

            transactionId:
              tid,

            coin,

            price:
              px,

            size,

            side:
              text(
                row.side
              ),

            direction:
              text(
                row.dir
              ),

            timestamp:
              timestampMs(
                row.time
              ),

            closedPnl:
              text(
                row.closedPnl
              ),

            fee:
              text(
                row.fee
              ),

            feeToken:
              text(
                row.feeToken
              ),

            crossed:
              booleanValue(
                row.crossed
              ),
          },
        ];
      }
    )
    .slice(
      0,
      limit
    );
}

function parseFunding(
  value:
    unknown,
  limit:
    number
): HyperliquidFundingPaymentEvidence[] {
  return array(
    value
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const delta =
          record(
            row.delta
          );

        if (
          delta &&
          text(
            delta.type
          ) !==
            "funding"
        ) {
          return [];
        }

        return [
          {
            hash:
              text(
                row.hash
              ),

            timestamp:
              timestampMs(
                row.time
              ),

            coin:
              text(
                delta?.coin
              ),

            usdc:
              text(
                delta?.usdc
              ),

            size:
              text(
                delta?.szi
              ),

            fundingRate:
              text(
                delta
                  ?.fundingRate
              ),
          },
        ];
      }
    )
    .slice(
      0,
      limit
    );
}

function parseNonFundingLedger(
  value:
    unknown,
  limit:
    number
): HyperliquidLedgerEvidence[] {
  return array(
    value
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const delta =
          record(
            row.delta
          );

        const type =
          text(
            delta?.type
          );

        if (!type) {
          return [];
        }

        return [
          {
            hash:
              text(
                row.hash
              ),

            timestamp:
              timestampMs(
                row.time
              ),

            type,

            usdc:
              text(
                delta?.usdc
              ),

            amount:
              text(
                delta?.amount
              ),

            token:
              text(
                delta?.token
              ),

            user:
              text(
                delta?.user
              ),

            destination:
              text(
                delta?.destination
              ),

            fee:
              text(
                delta?.fee
              ),

            nativeTokenFee:
              text(
                delta?.nativeTokenFee
              ),

            feeToken:
              text(
                delta?.feeToken
              ),

            toPerp:
              booleanValue(
                delta?.toPerp
              ),

            vault:
              text(
                delta?.vault
              ),

            requestedUsd:
              text(
                delta?.requestedUsd
              ),

            sourceDex:
              text(
                delta?.sourceDex
              ),

            destinationDex:
              text(
                delta?.destinationDex
              ),
          },
        ];
      }
    )
    .slice(
      0,
      limit
    );
}

function parsePortfolio(
  value:
    unknown,
  pointLimit:
    number
): HyperliquidPortfolioWindow[] {
  return array(
    value
  )
    .flatMap(
      item => {
        if (
          !Array.isArray(
            item
          ) ||
          item.length <
            2
        ) {
          return [];
        }

        const window =
          text(
            item[0]
          );

        const row =
          record(
            item[1]
          );

        if (
          !window ||
          !row
        ) {
          return [];
        }

        const accountValueHistory =
          array(
            row
              .accountValueHistory
          )
            .flatMap(
              point => {
                if (
                  !Array.isArray(
                    point
                  ) ||
                  point.length <
                    2
                ) {
                  return [];
                }

                const time =
                  timestampMs(
                    point[0]
                  );

                const valueText =
                  text(
                    point[1]
                  );

                if (
                  !time ||
                  valueText ===
                    null
                ) {
                  return [];
                }

                return [
                  {
                    timestamp:
                      time,

                    value:
                      valueText,
                  },
                ];
              }
            )
            .slice(
              -pointLimit
            );

        const pnlHistory =
          array(
            row.pnlHistory
          )
            .flatMap(
              point => {
                if (
                  !Array.isArray(
                    point
                  ) ||
                  point.length <
                    2
                ) {
                  return [];
                }

                const time =
                  timestampMs(
                    point[0]
                  );

                const valueText =
                  text(
                    point[1]
                  );

                if (
                  !time ||
                  valueText ===
                    null
                ) {
                  return [];
                }

                return [
                  {
                    timestamp:
                      time,

                    value:
                      valueText,
                  },
                ];
              }
            )
            .slice(
              -pointLimit
            );

        return [
          {
            window,

            volume:
              text(
                row.vlm
              ),

            accountValueHistory,

            pnlHistory,
          },
        ];
      }
    );
}

function providerErrorCode(
  error:
    unknown
) {
  if (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  ) {
    return "TIMEOUT" as const;
  }

  if (
    error instanceof
      Error &&
    error.name ===
      "AbortError"
  ) {
    return "TIMEOUT" as const;
  }

  if (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?:
          unknown;
      }
    ).code ===
      "RATE_LIMITED"
  ) {
    return "RATE_LIMITED" as const;
  }

  return "UPSTREAM_ERROR" as const;
}

export async function getHyperliquidEvidence(
  {
    address,
    analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },

  deps:
    HyperliquidProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  HyperliquidProviderResult
> {
  const user =
    normalizeHyperliquidAddress(
      address
    );

  if (!user) {
    return {
      ok:
        false,

      latencyMs:
        null,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Hyperliquid account address.",
    };
  }

  const policy =
    getHyperliquidAnalysisPolicy(
      analysisPlan
    );

  const started =
    deps.now();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      deps.timeoutMs
    );

  async function info(
    body:
      JsonRecord
  ) {
    const response =
      await providerUsageFetch({ provider: "hyperliquid", operation: "hyperliquid.info" }, deps.infoUrl, () => deps.fetchImpl(
        deps.infoUrl,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          cache:
            "no-store",

          signal:
            controller.signal,

          body:
            JSON.stringify(
              body
            ),
        }
      ));

    if (
      response.status ===
        429
    ) {
      throw Object.assign(
        new Error(
          "RATE_LIMITED"
        ),
        {
          code:
            "RATE_LIMITED",
        }
      );
    }

    if (!response.ok) {
      throw new Error(
        `HyperCore HTTP ${response.status}`
      );
    }

    return await response.json();
  }

  let rpcId =
    0;

  async function rpc(
    method:
      string,
    params:
      unknown[]
  ) {
    rpcId +=
      1;

    const response =
      await providerUsageFetch({ provider: "hyperliquid", operation: `hyperliquid.rpc.${method}` }, deps.evmRpcUrl, () => deps.fetchImpl(
        deps.evmRpcUrl,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          cache:
            "no-store",

          signal:
            controller.signal,

          body:
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                rpcId,

              method,

              params,
            }),
        }
      ));

    if (
      response.status ===
        429
    ) {
      throw Object.assign(
        new Error(
          "RATE_LIMITED"
        ),
        {
          code:
            "RATE_LIMITED",
        }
      );
    }

    if (!response.ok) {
      throw new Error(
        `HyperEVM HTTP ${response.status}`
      );
    }

    const body =
      record(
        await response.json()
      );

    if (
      !body ||
      body.error
    ) {
      throw new Error(
        "HyperEVM JSON-RPC error."
      );
    }

    return body.result;
  }

  try {
    const fundingStartTime =
      Math.max(
        0,
        deps.now() -
          policy
            .fundingLookbackDays *
          24 *
          60 *
          60 *
          1000
      );

    const ledgerStartTime =
      Math.max(
        0,
        deps.now() -
          policy
            .ledgerLookbackDays *
          24 *
          60 *
          60 *
          1000
      );

    const [
      clearinghouseRaw,
      spotRaw,
      fillsRaw,
      fundingRaw,
      ledgerRaw,
      portfolioRaw,
      roleRaw,
      chainIdRaw,
      balanceRaw,
      nonceRaw,
      codeRaw,
    ] =
      await Promise.all([
        info({
          type:
            "clearinghouseState",

          user,
        }),

        info({
          type:
            "spotClearinghouseState",

          user,
        }),

        info({
          type:
            "userFills",

          user,

          aggregateByTime:
            false,
        }),

        info({
          type:
            "userFunding",

          user,

          startTime:
            fundingStartTime,
        }),

        info({
          type:
            "userNonFundingLedgerUpdates",

          user,

          startTime:
            ledgerStartTime,
        }),

        info({
          type:
            "portfolio",

          user,
        }),

        info({
          type:
            "userRole",

          user,
        }),

        rpc(
          "eth_chainId",
          []
        ),

        rpc(
          "eth_getBalance",
          [
            user,
            "latest",
          ]
        ),

        rpc(
          "eth_getTransactionCount",
          [
            user,
            "latest",
          ]
        ),

        rpc(
          "eth_getCode",
          [
            user,
            "latest",
          ]
        ),
      ]);

    if (
      chainIdRaw !==
      "0x3e7"
    ) {
      return {
        ok:
          false,

        latencyMs:
          deps.now() -
          started,

        code:
          "CHAIN_ID_MISMATCH",

        error:
          "HyperEVM chain ID mismatch.",
      };
    }

    const clearinghouse =
      record(
        clearinghouseRaw
      );

    const margin =
      record(
        clearinghouse
          ?.marginSummary
      );

    const spot =
      record(
        spotRaw
      );

    const role =
      record(
        roleRaw
      );

    const nonce =
      hexQuantityToNumber(
        nonceRaw
      );

    const balanceWei =
      text(
        balanceRaw
      );

    const code =
      text(
        codeRaw
      );

    if (
      nonce ===
        null ||
      !balanceWei ||
      !/^0x[0-9a-fA-F]+$/.test(
        balanceWei
      ) ||
      !code ||
      !/^0x[0-9a-fA-F]*$/.test(
        code
      )
    ) {
      throw new Error(
        "Malformed HyperEVM latest-state response."
      );
    }

    const data:
      HyperliquidEvidence = {
        hyperCore: {
          role:
            text(
              role?.role
            ),

          accountValue:
            text(
              margin
                ?.accountValue
            ),

          withdrawable:
            text(
              clearinghouse
                ?.withdrawable
            ),

          totalNotionalPosition:
            text(
              margin
                ?.totalNtlPos
            ),

          totalMarginUsed:
            text(
              margin
                ?.totalMarginUsed
            ),

          positions:
            parsePositions(
              clearinghouse,
              policy
                .positionLimit
            ),

          spotBalances:
            parseSpotBalances(
              spot,
              policy
                .spotBalanceLimit
            ),

          fills:
            parseFills(
              fillsRaw,
              policy
                .fillLimit
            ),

          fundingPayments:
            parseFunding(
              fundingRaw,
              policy
                .fundingLimit
            ),

          portfolio:
            parsePortfolio(
              portfolioRaw,
              policy
                .portfolioPointLimit
            ),

          nonFundingLedger:
            parseNonFundingLedger(
              ledgerRaw,
              policy
                .ledgerLimit
            ),
        },

        hyperEvm: {
          chainId:
            999,

          nativeCurrency:
            "HYPE",

          balanceWei,

          transactionCount:
            nonce,

          code,

          isContract:
            code !==
              "0x" &&
            code !==
              "0x0",
        },

        coverage: {
          plan:
            analysisPlan,

          fillLimit:
            policy
              .fillLimit,

          fundingLimit:
            policy
              .fundingLimit,

          fundingLookbackDays:
            policy
              .fundingLookbackDays,

          positionLimit:
            policy
              .positionLimit,

          spotBalanceLimit:
            policy
              .spotBalanceLimit,

          portfolioPointLimit:
            policy
              .portfolioPointLimit,

          ledgerLimit:
            policy
              .ledgerLimit,

          ledgerLookbackDays:
            policy
              .ledgerLookbackDays,

          hyperCoreProvider:
            "hyperliquid-info",

          hyperEvmProvider:
            "hyperliquid-json-rpc",
        },
      };

    return {
      ok:
        true,

      latencyMs:
        deps.now() -
        started,

      data,
    };
  } catch (
    error
  ) {
    const code =
      providerErrorCode(
        error
      );

    return {
      ok:
        false,

      latencyMs:
        deps.now() -
        started,

      code,

      error:
        code ===
          "RATE_LIMITED"
          ? "Hyperliquid provider rate limit reached."
          : code ===
              "TIMEOUT"
            ? "Hyperliquid provider request timed out."
            : "Hyperliquid provider request failed.",
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export const HYPERLIQUID_INFO_MAINNET =
  HYPERCORE_INFO_URL;

export const HYPEREVM_RPC_MAINNET =
  HYPEREVM_RPC_URL;
