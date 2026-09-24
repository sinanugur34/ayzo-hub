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
  isTronAddress,
} from "@/lib/intelligence/tron/address";

import {
  runTronIntelligence,
} from "@/lib/intelligence/tron/engine";

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
          "tron" &&
        !isTronAddress(
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

    switch (
      resolution.engine
    ) {
      case "solana": {
        const result =
          await runSolanaIntelligence({
            address,

            requestUrl:
              request.url,

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
          });

        return finish(
          result.status,
          result.data
        );
      }
    }
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
