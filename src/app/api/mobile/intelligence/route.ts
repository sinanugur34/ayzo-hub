import { isAddress } from "@solana/kit";

import {
  authenticateMobileRequest,
} from "@/lib/account/mobileRequestAuth";

import {
  getMobileEntitlement,
} from "@/lib/account/mobileEntitlement";

import {
  consumeMobileAnalysisQuota,
  getMobileAnalysisQuotaStatus,
  refundMobileAnalysisQuota,
  type MobileAnalysisQuotaState,
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
  readJsonObjectBody,
} from "@/lib/requestBody";

import {
  readAnalysisFailureCode,
  recordAnalysisActivity,
} from "@/lib/adminAnalytics";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

type MobileResponseMeta = {
  plan: "free" | "pro" | "advanced";
  billingAvailable: boolean;
  quota: {
    limit: number;
    remaining: number | null;
    resetAt: number | null;
  };
};

function withMobileMeta(
  data: unknown,
  meta: MobileResponseMeta
) {
  if (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data)
  ) {
    return {
      ...data,
      mobile: meta,
    };
  }

  return {
    ok: true,
    data,
    mobile: meta,
  };
}

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

export async function POST(
  request: Request
) {
  let quota:
    MobileAnalysisQuotaState |
    null = null;

  let quotaUserId:
    string |
    null = null;

  let loadLease:
    AnalysisLoadLease |
    null = null;

  const clientIp =
    getClientIp(
      request
    );

  const rateLimit =
    await checkRateLimit({
      key:
        `mobile-intelligence:${clientIp}`,
      limit:
        10,
      windowMs:
        60_000,
    });

  if (!rateLimit.allowed) {
    return json(
      {
        ok: false,
        code:
          "RATE_LIMITED",
        error:
          "Too many analysis requests.",
        retryAfterSeconds:
          rateLimit.retryAfterSeconds,
      },
      429,
      {
        "Retry-After":
          String(
            rateLimit.retryAfterSeconds
          ),
      }
    );
  }

  try {
    const auth =
      await authenticateMobileRequest(
        request
      );

    if (!auth.ok) {
      return json(
        {
          ok: false,
          code:
            auth.code,
          error:
            auth.error,
        },
        auth.status
      );
    }

    const loadGuard =
      await acquireAnalysisLoadGuard({
        clientKey:
          `mobile-user:${auth.identity.userId}`,
      });

    if (!loadGuard.ok) {
      return json(
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
              ? "Too many analyses are already running for this account."
              : "AYZO is temporarily busy. Please retry shortly.",
          retryAfterSeconds:
            loadGuard.retryAfterSeconds,
        },
        loadGuard.reason ===
        "client_busy"
          ? 429
          : 503,
        {
          "Retry-After":
            String(
              loadGuard.retryAfterSeconds
            ),
        }
      );
    }

    loadLease =
      loadGuard.lease;

    const parsedBody =
      await readJsonObjectBody(
        request
      );

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body =
      parsedBody.body;

    const resolution =
      resolveIntelligenceNetwork(
        body.network
      );

    if (!resolution.ok) {
      return json(
        {
          ok: false,
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
          ok: false,
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

    if (
      resolution.engine ===
        "solana" &&
      !isAddress(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Solana address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    if (
      resolution.engine ===
        "evm" &&
      !EVM_ADDRESS.test(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid EVM address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    if (
      resolution.engine ===
        "bitcoin" &&
      !isBitcoinMainnetAddress(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Bitcoin address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    if (
      resolution.engine ===
        "dogecoin" &&
      !isDogecoinMainnetAddress(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid Dogecoin address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    if (
      resolution.engine ===
        "tron" &&
      !isTronAddress(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid TRON address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    if (
      resolution.engine ===
        "xrpl" &&
      !isXrplClassicAddress(
        address
      )
    ) {
      return json(
        {
          ok: false,
          code:
            "INVALID_ADDRESS",
          error:
            "Invalid XRP Ledger classic address.",
          network:
            resolution.networkId,
        },
        400
      );
    }

    const {
      entitlement,
      billingAvailable,
    } =
      await getMobileEntitlement(
        auth.identity.userId
      );

    quotaUserId =
      auth.identity.userId;

    quota =
      await consumeMobileAnalysisQuota(
        quotaUserId,
        entitlement.planId
      );

    if (!quota.allowed) {
      await recordAnalysisActivity({
        userId:
          quotaUserId,

        platform:
          "android",

        network:
          resolution.networkId,

        planId:
          entitlement.planId,

        outcome:
          "quota_blocked",

        httpStatus:
          429,

        failureCode:
          entitlement.planId ===
            "advanced"
            ? "DAILY_ADVANCED_LIMIT"
            : entitlement.planId ===
                "pro"
              ? "DAILY_PRO_LIMIT"
              : "DAILY_FREE_LIMIT",

        quotaLimit:
          quota.limit,

        quotaRemaining:
          0,

        quotaResetAt:
          quota.resetAt,
      });

      const retryAfterSeconds =
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
          : 24 * 60 * 60;

      return json(
        {
          ok: false,
          code:
            entitlement.planId ===
              "advanced"
              ? "DAILY_ADVANCED_LIMIT"
              : entitlement.planId ===
                  "pro"
                ? "DAILY_PRO_LIMIT"
                : "DAILY_FREE_LIMIT",
          error:
            "Daily analysis limit reached.",
          plan:
            entitlement.planId,
          billingAvailable,
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
              retryAfterSeconds
            ),
        }
      );
    }

    const mobileMeta: MobileResponseMeta = {
      plan:
        entitlement.planId,
      billingAvailable,
      quota: {
        limit:
          quota.limit,
        remaining:
          quota.remaining,
        resetAt:
          quota.resetAt,
      },
    };

    const recordMobileResult =
      async (
        status: number,
        data: unknown
      ) => {
        const failed =
          status >= 400;

        await recordAnalysisActivity({
          userId:
            quotaUserId,

          platform:
            "android",

          network:
            resolution.networkId,

          planId:
            entitlement.planId,

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
            quota?.limit ??
            null,

          quotaRemaining:
            failed &&
            quota &&
            quotaUserId
              ? (
                  await getMobileAnalysisQuotaStatus(
                    quotaUserId,
                    entitlement.planId
                  )
                ).remaining
              : quota?.remaining ??
                null,

          quotaResetAt:
            failed &&
            quota &&
            quotaUserId
              ? (
                  await getMobileAnalysisQuotaStatus(
                    quotaUserId,
                    entitlement.planId
                  )
                ).resetAt
              : quota?.resetAt ??
                null,
        });
      };

    const refundOnFailure =
      async (
        status: number
      ) => {
        if (
          status >= 400 &&
          quota &&
          quotaUserId
        ) {
          await refundMobileAnalysisQuota(
            quotaUserId,
            quota
          );
        }
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
            analysisPlan:
              entitlement.planId,
            testFailure:
              null,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }

      case "evm": {
        const result =
          await runEvmUnifiedIntelligence({
            networkId:
              resolution.networkId,
            address,
            analysisPlan:
              entitlement.planId,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }

      case "bitcoin": {
        const result =
          await runBitcoinIntelligence({
            address,
            analysisPlan:
              entitlement.planId,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }

      case "dogecoin": {
        const result =
          await runDogecoinIntelligence({
            address,

            analysisPlan:
              entitlement.planId,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }

      case "tron": {
        const result =
          await runTronIntelligence({
            address,

            analysisPlan:
              entitlement.planId,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }

      case "xrpl": {
        const result =
          await runXrplIntelligence({
            address,
            analysisPlan:
              entitlement.planId,
          });

        await refundOnFailure(
          result.status
        );

        await recordMobileResult(
          result.status,
          result.data
        );

        return json(
          withMobileMeta(
            result.data,
            mobileMeta
          ),
          result.status
        );
      }
    }
  } catch {
    if (
      quota &&
      quotaUserId
    ) {
      await refundMobileAnalysisQuota(
        quotaUserId,
        quota
      );
    }

    return json(
      {
        ok: false,
        code:
          "UPSTREAM_ERROR",
        error:
          "AYZO Intelligence Pipeline failed.",
      },
      500
    );
  }  finally {
    await loadLease?.release();
  }

}
