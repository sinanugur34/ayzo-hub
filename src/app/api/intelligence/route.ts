import { isAddress } from "@solana/kit";
import { cookies } from "next/headers";

import {
  consumeAnalysisQuota,
  getAnalysisQuotaStatus,
  refundAnalysisQuota,
  refundAnalysisQuotaOnFailure,
} from "@/lib/analysisQuota";

import {
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";
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
  getWebAnalysisPriority,
} from "@/lib/analysisPriority";

import { readJsonObjectBody } from "@/lib/requestBody";

import {
  readAnalysisFailureCode,
  recordAnalysisActivity,
} from "@/lib/adminAnalytics";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export async function POST(request: Request) {
  let quota:
    Awaited<
      ReturnType<
        typeof consumeAnalysisQuota
      >
    > | null = null;

  let loadLease:
    AnalysisLoadLease |
    null = null;

  const isDevelopmentTestRequest =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-ayzo-test-request") === "smoke";

  const clientIp =
    getClientIp(request);

  if (!isDevelopmentTestRequest) {
    const rateLimit = await checkRateLimit({
      key: `intelligence:${clientIp}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          error: "Too many analysis requests.",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }
  }

  try {
    const parsedBody =
      await readJsonObjectBody(request);

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;

    const resolution =
      resolveIntelligenceNetwork(body.network);

    if (!resolution.ok) {
      return Response.json(
        {
          ok: false,
          code: resolution.code,
          error: resolution.error,
          network: resolution.networkId,
        },
        {
          status:
            resolution.code ===
            "NETWORK_NOT_AVAILABLE"
              ? 503
              : 400,
        }
      );
    }

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    if (!address) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Address is required.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "solana" &&
      !isAddress(address)
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Solana address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "evm" &&
      !EVM_ADDRESS.test(address)
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid EVM address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "bitcoin" &&
      !isBitcoinMainnetAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Bitcoin address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "dogecoin" &&
      !isDogecoinMainnetAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Dogecoin address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine ===
        "litecoin" &&
      !isLitecoinMainnetAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Litecoin address.",
          network:
            resolution.networkId,
        },
        {
          status: 400,
        }
      );
    }


    if (
      resolution.engine === "sui" &&
      !isSuiAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Sui address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine ===
        "aptos" &&
      !normalizeAptosAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Aptos account address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine ===
        "cardano" &&
      !isCardanoPaymentAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Cardano mainnet payment address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine ===
        "zcash" &&
      !normalizeZcashTransparentAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Zcash transparent mainnet address.",
          network:
            resolution.networkId,
        },
        {
          status: 400,
        }
      );
    }

    if (
      resolution.engine ===
        "algorand" &&
      !normalizeAlgorandAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Algorand address.",
          network:
            resolution.networkId,
        },
        {
          status: 400,
        }
      );
    }

    if (
      resolution.engine === "ton" &&
      !isTonAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid TON address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "hyperliquid" &&
      !isHyperliquidAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Hyperliquid account address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "stellar" &&
      !isStellarAccountAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error: "Invalid Stellar account address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (
      resolution.engine === "xrpl" &&
      !isXrplClassicAddress(
        address
      )
    ) {
      return Response.json(
        {
          ok: false,
          code: "INVALID_ADDRESS",
          error:
            "Invalid XRP Ledger classic address.",
          network: resolution.networkId,
        },
        { status: 400 }
      );
    }

    if (!isDevelopmentTestRequest) {
      const priorityAnalysis =
        await getWebAnalysisPriority();

      const loadGuard =
        await acquireAnalysisLoadGuard({
          clientKey:
            `web:${clientIp}`,

          priority:
            priorityAnalysis,
        });

      if (!loadGuard.ok) {
        return Response.json(
          {
            ok: false,
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
                ? "Too many analyses are already running for this client."
                : "AYZO is temporarily busy. Please retry shortly.",
            retryAfterSeconds:
              loadGuard.retryAfterSeconds,
          },
          {
            status:
              loadGuard.reason ===
              "client_busy"
                ? 429
                : 503,
            headers: {
              "Retry-After":
                String(
                  loadGuard.retryAfterSeconds
                ),
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      loadLease =
        loadGuard.lease;
    }

    const testFailure =
      process.env.NODE_ENV !== "production" &&
      (body.__testFailure === "relationships" ||
        body.__testFailure === "funding")
        ? body.__testFailure
        : null;

    let analysisPlan:
      "free" | "pro" | "advanced" =
        "free";

    if (!isDevelopmentTestRequest) {
      quota =
        await consumeAnalysisQuota(
          request,
          resolution.networkId
        );

      analysisPlan =
        quota.plan;

      if (quota.deviceCookie) {
        const cookieStore = await cookies();

        cookieStore.set(
          FREE_DEVICE_COOKIE,
          quota.deviceCookie,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: FREE_DEVICE_COOKIE_MAX_AGE,
          }
        );
      }

      if (!quota.allowed) {
        const networkBlocked =
          quota.plan ===
            "free" &&
          quota.blockedBy ===
            "network";

        const failureCode =
          networkBlocked
            ? "DAILY_NETWORK_LIMIT"
            : quota.plan ===
                "advanced"
              ? "DAILY_ADVANCED_LIMIT"
              : quota.plan ===
                  "pro"
                ? "DAILY_PRO_LIMIT"
                : "DAILY_FREE_LIMIT";

        const resetAt =
          networkBlocked
            ? quota.networkResetAt ??
              quota.resetAt
            : quota.resetAt;

        await recordAnalysisActivity({
          userId:
            quota.userId,

          platform:
            "web",

          network:
            resolution.networkId,

          planId:
            quota.plan,

          outcome:
            "quota_blocked",

          httpStatus:
            429,

          failureCode,

          quotaLimit:
            quota.limit,

          quotaRemaining:
            quota.remaining,

          quotaResetAt:
            resetAt,
        });

        const retryAfterSeconds =
          resetAt
            ? Math.max(
                1,
                Math.ceil(
                  (
                    resetAt -
                    Date.now()
                  ) /
                    1000
                )
              )
            : 24 * 60 * 60;

        return Response.json(
          {
            ok:
              false,

            code:
              failureCode,

            error:
              networkBlocked
                ? `AYZO Free allows a maximum of ${quota.networkLimit ?? 2} analyses on ${resolution.network.name} within the current rolling 24-hour window. You can continue with another supported network.`
                : quota.plan ===
                    "advanced"
                  ? "Daily Advanced analysis limit reached."
                  : quota.plan ===
                      "pro"
                    ? "Daily Pro analysis limit reached."
                    : "Daily free analysis limit reached.",

            plan:
              quota.plan,

            network:
              resolution.networkId,

            quota: {
              limit:
                quota.limit,

              remaining:
                quota.remaining,

              resetAt:
                quota.resetAt,

              network:
                quota.network ??
                resolution.networkId,

              networkLimit:
                quota.plan ===
                  "free"
                  ? quota.networkLimit ??
                    2
                  : null,

              networkRemaining:
                quota.plan ===
                  "free"
                  ? quota.networkRemaining ??
                    null
                  : null,

              networkResetAt:
                quota.plan ===
                  "free"
                  ? quota.networkResetAt ??
                    null
                  : null,
            },
          },
          {
            status:
              429,

            headers: {
              "Retry-After":
                String(
                  retryAfterSeconds
                ),

              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    }

    const recordWebResult =
      async (
        status: number,
        data: unknown
      ) => {
        if (
          isDevelopmentTestRequest ||
          !quota
        ) {
          return;
        }

        const failed =
          status >= 400;

        await recordAnalysisActivity({
          userId:
            quota.userId,

          platform:
            "web",

          network:
            resolution.networkId,

          planId:
            quota.plan,

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
            quota.limit,

          quotaRemaining:
            failed
              ? (
                  await getAnalysisQuotaStatus(
                    request
                  )
                ).remaining
              : quota.remaining,

          quotaResetAt:
            failed
              ? (
                  await getAnalysisQuotaStatus(
                    request
                  )
                ).resetAt
              : quota.resetAt,
        });
      };

    switch (resolution.engine) {
      case "solana": {
        const result =
          await runSolanaIntelligence({
            address,
            requestUrl:
              request.url,
            analysisPlan,
            testFailure,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          { status: result.status }
        );
      }

      case "evm": {
        const result =
          await runEvmUnifiedIntelligence({
            networkId:
              resolution.networkId,
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "bitcoin": {
        const result =
          await runBitcoinIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "dogecoin": {
        const result =
          await runDogecoinIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "litecoin": {
        const result =
          await runLitecoinIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "sui": {
        const result =
          await runSuiIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "cardano": {
        const result =
          await runCardanoIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "aptos": {
        const result =
          await runAptosIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "near": {
        const result =
          await runNearIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "zcash": {
        const result =
          await runZcashIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "algorand": {
        const result =
          await runAlgorandIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "polkadot": {
        const result =
          await runPolkadotIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "cosmos": {
        const result =
          await runCosmosIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "injective": {
        const result =
          await runInjectiveIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "hedera": {
        const result =
          await runHederaIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "ton": {
        const result =
          await runTonIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "stellar": {
        const result =
          await runStellarIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "hyperliquid": {
        const result =
          await runHyperliquidIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "tron": {
        const result =
          await runTronIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }

      case "xrpl": {
        const result =
          await runXrplIntelligence({
            address,
            analysisPlan,
          });

        await refundAnalysisQuotaOnFailure(
          request,
          quota,
          result.status
        );

        await recordWebResult(
          result.status,
          result.data
        );

        return Response.json(
          result.data,
          {
            status:
              result.status,
          }
        );
      }
    }

    /*
     * Network families may be registered as
     * development before their production
     * intelligence engines are connected.
     *
     * resolveIntelligenceNetwork() normally
     * blocks those networks before this point.
     * This fallback keeps the route total and
     * prevents accidental partial exposure if a
     * registry status is changed prematurely.
     */
    return Response.json(
      {
        ok: false,
        code:
          "NETWORK_NOT_AVAILABLE",
        error:
          `${resolution.network.name} intelligence engine is not connected yet.`,
        network:
          resolution.networkId,
      },
      {
        status: 503,
      }
    );

  } catch {
    if (
      !isDevelopmentTestRequest &&
      quota
    ) {
      await refundAnalysisQuota(
        request,
        quota
      );
    }

    return Response.json(
      {
        ok: false,
        code: "UPSTREAM_ERROR",
        error: "AYZO Intelligence Pipeline failed.",
      },
      { status: 500 }
    );
  } finally {
    await loadLease?.release();
  }
}
