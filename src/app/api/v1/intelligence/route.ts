import { runProviderUsageAnalysis } from "@/lib/providerUsageAnalysis";
import {
  isAddress,
} from "@solana/kit";

import {
  authenticateApiKey,
} from "@/lib/account/apiKeyAuth";

import {
  consumeMobileAnalysisQuota as consumeApiAnalysisQuota,
  getMobileAnalysisQuotaStatus as getApiAnalysisQuotaStatus,
  refundMobileAnalysisQuota as refundApiAnalysisQuota,
  type MobileAnalysisQuotaState as ApiAnalysisQuotaState,
} from "@/lib/account/mobileAnalysisQuota";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

import {
  runBitcoinIntelligence,
} from "@/lib/intelligence/bitcoin/engine";

import {
  isDogecoinMainnetAddress,
} from "@/lib/intelligence/dogecoin/address";

import {
  runDogecoinIntelligence,
} from "@/lib/intelligence/dogecoin/engine";

import {
  isLitecoinMainnetAddress,
} from "@/lib/intelligence/litecoin/address";

import {
  runLitecoinIntelligence,
} from "@/lib/intelligence/litecoin/engine";

import {
  isSuiAddress,
} from "@/lib/intelligence/sui/address";

import {
  runSuiIntelligence,
} from "@/lib/intelligence/sui/engine";

import {
  isCardanoPaymentAddress,
} from "@/lib/intelligence/cardano/address";

import {
  runCardanoIntelligence,
} from "@/lib/intelligence/cardano/engine";

import {
  normalizeAptosAddress,
} from "@/lib/intelligence/aptos/address";

import {
  runAptosIntelligence,
} from "@/lib/intelligence/aptos/engine";

import {
  runNearIntelligence,
} from "@/lib/intelligence/near/engine";

import {
  runHederaIntelligence,
} from "@/lib/intelligence/hedera/engine";

import {
  normalizeZcashTransparentAddress,
} from "@/lib/intelligence/zcash/address";

import {
  runZcashIntelligence,
} from "@/lib/intelligence/zcash/engine";

import {
  normalizeAlgorandAddress,
} from "@/lib/intelligence/algorand/address";

import {
  runAlgorandIntelligence,
} from "@/lib/intelligence/algorand/engine";

import {
  runPolkadotIntelligence,
} from "@/lib/intelligence/polkadot/engine";

import {
  runCosmosIntelligence,
} from "@/lib/intelligence/cosmos/engine";

import {
  runInjectiveIntelligence,
} from "@/lib/intelligence/injective/engine";

import {
  isTonAddress,
} from "@/lib/intelligence/ton/address";

import {
  runTonIntelligence,
} from "@/lib/intelligence/ton/engine";

import {
  isStellarAccountAddress,
} from "@/lib/intelligence/stellar/address";

import {
  runStellarIntelligence,
} from "@/lib/intelligence/stellar/engine";

import {
  isHyperliquidAddress,
} from "@/lib/intelligence/hyperliquid/address";

import {
  runHyperliquidIntelligence,
} from "@/lib/intelligence/hyperliquid/engine";

import {
  isTronAddress,
} from "@/lib/intelligence/tron/address";

import {
  runTronIntelligence,
} from "@/lib/intelligence/tron/engine";

import {
  isXrplClassicAddress,
} from "@/lib/intelligence/xrpl/address";

import {
  runXrplIntelligence,
} from "@/lib/intelligence/xrpl/engine";

import {
  runEvmUnifiedIntelligence,
} from "@/lib/intelligence/evm/unifiedOrchestrator";

import {
  runSolanaIntelligence,
} from "@/lib/intelligence/solana/engine";

import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

import {
  acquireAnalysisLoadGuard,
  type AnalysisLoadLease,
} from "@/lib/analysisLoadGuard";

import {
  planHasPriorityAnalysis,
} from "@/lib/analysisPriorityPolicy";

import {
  readJsonObjectBody,
} from "@/lib/requestBody";

import {
  readAnalysisFailureCode,
  recordAnalysisActivity,
} from "@/lib/adminAnalytics";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

function json(
  body: unknown,
  status: number,
  headers: HeadersInit = {}
) {
  return Response.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",

        ...headers,
      },
    }
  );
}

function withApiMeta(
  data: unknown,
  quota:
    ApiAnalysisQuotaState
) {
  const meta = {
    plan:
      quota.plan,

    quota: {
      limit:
        quota.limit,

      remaining:
        quota.remaining,

      resetAt:
        quota.resetAt,
    },
  };

  if (
    typeof data ===
      "object" &&
    data !== null &&
    !Array.isArray(data)
  ) {
    return {
      ...data,
      api:
        meta,
    };
  }

  return {
    ok:
      true,

    data,

    api:
      meta,
  };
}

export async function POST(
  request: Request
) {
  let quota:
    ApiAnalysisQuotaState |
    null = null;

  let userId:
    string |
    null = null;

  let loadLease:
    AnalysisLoadLease |
    null = null;

  try {
    const clientIp =
      getClientIp(
        request
      );

    const ipLimit =
      await checkRateLimit({
        key:
          `public-api-ip:${clientIp}`,

        limit:
          30,

        windowMs:
          60_000,
      });

    if (!ipLimit.allowed) {
      return json(
        {
          ok:
            false,

          code:
            "RATE_LIMITED",

          error:
            "Too many API requests.",

          retryAfterSeconds:
            ipLimit
              .retryAfterSeconds,
        },
        429,
        {
          "Retry-After":
            String(
              ipLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    const auth =
      await authenticateApiKey(
        request
      );

    if (!auth.ok) {
      return json(
        {
          ok:
            false,

          code:
            auth.code,

          error:
            auth.error,
        },
        auth.status
      );
    }

    userId =
      auth.identity
        .userId;

    const keyLimit =
      await checkRateLimit({
        key:
          `public-api-key:${auth.identity.keyId}`,

        limit:
          10,

        windowMs:
          60_000,
      });

    if (!keyLimit.allowed) {
      return json(
        {
          ok:
            false,

          code:
            "RATE_LIMITED",

          error:
            "API key rate limit reached.",

          retryAfterSeconds:
            keyLimit
              .retryAfterSeconds,
        },
        429,
        {
          "Retry-After":
            String(
              keyLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    const loadGuard =
      await acquireAnalysisLoadGuard({
        clientKey:
          `api-user:${userId}`,

        priority:
          planHasPriorityAnalysis(
            auth.identity.planId
          ),
      });

    if (!loadGuard.ok) {
      return json(
        {
          ok:
            false,

          code:
            loadGuard.reason ===
              "client_busy"
              ? "ANALYSIS_ALREADY_RUNNING"
              : loadGuard.reason ===
                  "global_busy"
                ? "SYSTEM_BUSY"
                : "LOAD_GUARD_UNAVAILABLE",

          error:
            loadGuard.reason ===
              "client_busy"
              ? "An analysis is already running for this account."
              : "AYZO is temporarily busy. Please retry shortly.",

          retryAfterSeconds:
            loadGuard
              .retryAfterSeconds,
        },
        loadGuard.reason ===
          "client_busy"
          ? 429
          : 503,
        {
          "Retry-After":
            String(
              loadGuard
                .retryAfterSeconds
            ),
        }
      );
    }

    loadLease =
      loadGuard.lease;

    const parsed =
      await readJsonObjectBody(
        request
      );

    if (!parsed.ok) {
      return parsed.response;
    }

    const body =
      parsed.body;

    const resolution =
      resolveIntelligenceNetwork(
        body.network
      );

    if (!resolution.ok) {
      return json(
        {
          ok:
            false,

          code:
            resolution.code,

          error:
            resolution.error,

          network:
            resolution.networkId,
        },
        resolution.code ===
          "NETWORK_NOT_AVAILABLE"
          ? 503
          : 400
      );
    }

    const address =
      typeof body.address ===
        "string"
        ? body.address.trim()
        : "";

    if (!address) {
      return json(
        {
          ok:
            false,

          code:
            "INVALID_ADDRESS",

          error:
            "Address is required.",

          network:
            resolution.networkId,
        },
        400
      );
    }

    const invalid =
      (
        resolution.engine ===
          "solana" &&
        !isAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "evm" &&
        !EVM_ADDRESS.test(
          address
        )
      ) ||
      (
        resolution.engine ===
          "bitcoin" &&
        !isBitcoinMainnetAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "dogecoin" &&
        !isDogecoinMainnetAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "litecoin" &&
        !isLitecoinMainnetAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "sui" &&
        !isSuiAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "ton" &&
        !isTonAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "hyperliquid" &&
        !isHyperliquidAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "stellar" &&
        !isStellarAccountAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "tron" &&
        !isTronAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "xrpl" &&
        !isXrplClassicAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "cardano" &&
        !isCardanoPaymentAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "aptos" &&
        !normalizeAptosAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "zcash" &&
        !normalizeZcashTransparentAddress(
          address
        )
      ) ||
      (
        resolution.engine ===
          "algorand" &&
        !normalizeAlgorandAddress(
          address
        )
      );

    if (invalid) {
      return json(
        {
          ok:
            false,

          code:
            "INVALID_ADDRESS",

          error:
            "Invalid address for the selected network.",

          network:
            resolution.networkId,
        },
        400
      );
    }

    quota =
      await consumeApiAnalysisQuota(
        auth.identity.userId,
        auth.identity
          .planId
      );

    if (!quota.allowed) {
      await recordAnalysisActivity({
        userId,

        platform:
          "api",

        network:
          resolution.networkId,

        planId:
          auth.identity
            .planId,

        outcome:
          "quota_blocked",

        httpStatus:
          429,

        failureCode:
          "DAILY_ADVANCED_LIMIT",

        quotaLimit:
          quota.limit,

        quotaRemaining:
          0,

        quotaResetAt:
          quota.resetAt,
      });

      const retryAfter =
        quota.resetAt
          ? Math.max(
              1,
              Math.ceil(
                (
                  quota.resetAt -
                  Date.now()
                ) /
                  1000
              )
            )
          : 86400;

      return json(
        {
          ok:
            false,

          code:
            "DAILY_ADVANCED_LIMIT",

          error:
            "Daily Advanced analysis limit reached.",

          quota: {
            limit:
              quota.limit,

            remaining:
              0,

            resetAt:
              quota.resetAt,
          },
        },
        429,
        {
          "Retry-After":
            String(
              retryAfter
            ),
        }
      );
    }

    const refundOnFailure =
      async (
        status: number
      ) => {
        if (
          status >= 400 &&
          quota &&
          userId
        ) {
          await refundApiAnalysisQuota(
            userId,
            quota
          );
        }
      };

    const recordResult =
      async (
        status: number,
        data: unknown
      ) => {
        const failed =
          status >= 400;

        const currentQuota =
          failed &&
          userId
            ? await getApiAnalysisQuotaStatus(
                userId,
                auth.identity
                  .planId
              )
            : quota;

        await recordAnalysisActivity({
          userId,

          platform:
            "api",

          network:
            resolution.networkId,

          planId:
            auth.identity
              .planId,

          outcome:
            failed
              ? "failed"
              : "completed",

          httpStatus:
            status,

          failureCode:
            failed
              ? readAnalysisFailureCode(
                  data
                )
              : null,

          quotaLimit:
            currentQuota
              ?.limit ??
            null,

          quotaRemaining:
            currentQuota
              ?.remaining ??
            null,

          quotaResetAt:
            currentQuota
              ?.resetAt ??
            null,
        });
      };

    const finish =
      async (
        status: number,
        data: unknown
      ) => {
        await refundOnFailure(
          status
        );

        await recordResult(
          status,
          data
        );

        return json(
          withApiMeta(
            data,
            quota as ApiAnalysisQuotaState
          ),
          status
        );
      };

        const runMeasuredAnalysis =
      async <T>(
        callback:
          () => Promise<T>
      ): Promise<T> => {
        const measured =
          await runProviderUsageAnalysis(
            {
              userId:
                userId,

              platform:
                "api",

              planId:
                auth.identity.planId,

              network:
                resolution.networkId,
            },

            callback
          );

        return measured.value;
      };

    /* AYZO_PROVIDER_USAGE_SCOPE_V1 */
    return runMeasuredAnalysis(async () => {
switch (
      resolution.engine
    ) {
      case "solana": {
        const result =
          await runSolanaIntelligence({
            address,

            requestUrl:
              request.url,

            analysisPlan:
              auth.identity
                .planId,

            testFailure:
              null,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "evm": {
        const result =
          await runEvmUnifiedIntelligence({
            networkId:
              resolution.networkId,

            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "bitcoin": {
        const result =
          await runBitcoinIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "dogecoin": {
        const result =
          await runDogecoinIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "litecoin": {
        const result =
          await runLitecoinIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "sui": {
        const result =
          await runSuiIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "cardano": {
        const result =
          await runCardanoIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "aptos": {
        const result =
          await runAptosIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "zcash": {
        const result =
          await runZcashIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "algorand": {
        const result =
          await runAlgorandIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "polkadot": {
        const result =
          await runPolkadotIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "cosmos": {
        const result =
          await runCosmosIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "injective": {
        const result =
          await runInjectiveIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "near": {
        const result =
          await runNearIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "hedera": {
        const result =
          await runHederaIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "ton": {
        const result =
          await runTonIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "stellar": {
        const result =
          await runStellarIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "hyperliquid": {
        const result =
          await runHyperliquidIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "tron": {
        const result =
          await runTronIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }

      case "xrpl": {
        const result =
          await runXrplIntelligence({
            address,

            analysisPlan:
              auth.identity
                .planId,
          });

        return finish(
          result.status,
          result.data
        );
      }
    }

    /*
     * Development-registered network families
     * remain unavailable until their native
     * production engines are connected.
     */
    return json(
      {
        ok: false,
        code:
          "NETWORK_NOT_AVAILABLE",
        error:
          `${resolution.network.name} intelligence engine is not connected yet.`,
        network:
          resolution.networkId,
      },
      503
    );

    });
  } catch {
    if (
      quota &&
      userId
    ) {
      await refundApiAnalysisQuota(
        userId,
        quota
      );
    }

    return json(
      {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        error:
          "AYZO API intelligence request failed.",
      },
      500
    );
  } finally {
    await loadLease
      ?.release();
  }
}
