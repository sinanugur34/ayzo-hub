import "server-only";

import {
  createHmac,
} from "node:crypto";

import {
  Redis,
} from "@upstash/redis";

import {
  getAnalysisQuotaPolicy,
  type QuotaPlan,
} from "@/lib/analysisQuotaPolicy";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  consumeFreeAnalysis,
  getFreeQuotaStatus,
  refundFreeAnalysis,
  type FreeQuotaState,
} from "@/lib/freeQuota";

import {
  consumeMobileAnalysisQuota,
  getMobileAnalysisQuotaStatus,
  refundMobileAnalysisQuota,
  type MobileAnalysisQuotaState,
} from "@/lib/account/mobileAnalysisQuota";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";

import {
  redisRuntimePrefix,
} from "@/lib/redisRuntimeNamespace";

export type AnalysisQuotaState =
  FreeQuotaState & {
    plan:
      QuotaPlan;

    userId:
      string |
      null;
  };

let redisClient:
  Redis |
  null |
  undefined;

function getRedis() {
  if (
    redisClient !==
    undefined
  ) {
    return redisClient;
  }

  const url =
    process.env
      .KV_REST_API_URL;

  const token =
    process.env
      .KV_REST_API_TOKEN;

  if (
    !url ||
    !token
  ) {
    redisClient =
      null;

    return redisClient;
  }

  redisClient =
    new Redis({
      url,
      token,
    });

  return redisClient;
}

type PaidQuotaPlan =
  | "pro"
  | "advanced";

function hashUserId(
  userId:
    string,
  plan:
    PaidQuotaPlan
) {
  /*
   * Preserve the historical Pro
   * hash input exactly so existing
   * Pro daily counters are not reset.
   */
  const namespace =
    plan === "pro"
      ? "pro-quota"
      : "advanced-quota";

  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      `${namespace}:${userId}`
    )
    .digest("hex");
}

function paidQuotaKey(
  userId:
    string,
  plan:
    PaidQuotaPlan
) {
  return (
    `ayzo:${redisRuntimePrefix()}quota:v1:${plan}:user:` +
    hashUserId(
      userId,
      plan
    )
  );
}

function countValue(
  value:
    unknown
) {
  const numeric =
    Number(
      value ??
      0
    );

  return Number.isFinite(
    numeric
  )
    ? Math.max(
        0,
        numeric
      )
    : 0;
}

function resetAtFromTtl(
  ttl:
    number
) {
  if (
    !Number.isFinite(
      ttl
    ) ||
    ttl <=
      0
  ) {
    return null;
  }

  return (
    Date.now() +
    ttl * 1000
  );
}

function accountQuotaState(
  userId:
    string,
  quota:
    MobileAnalysisQuotaState
): AnalysisQuotaState {
  return {
    plan:
      quota.plan,

    userId,

    allowed:
      quota.allowed,

    available:
      quota.available,

    limit:
      quota.limit,

    remaining:
      quota.remaining,

    resetAt:
      quota.resetAt,

    deviceCookie:
      null,

    network:
      quota.network,

    networkLimit:
      quota.networkLimit,

    networkRemaining:
      quota.networkRemaining,

    networkResetAt:
      quota.networkResetAt,

    blockedBy:
      quota.blockedBy,
  };
}

function accountQuotaForRefund(
  quota:
    AnalysisQuotaState
): MobileAnalysisQuotaState {
  return {
    plan:
      quota.plan,

    allowed:
      quota.allowed,

    available:
      quota.available,

    limit:
      quota.limit,

    remaining:
      quota.remaining,

    resetAt:
      quota.resetAt,

    network:
      quota.network ??
      null,

    networkLimit:
      quota.networkLimit ??
      null,

    networkRemaining:
      quota.networkRemaining ??
      null,

    networkResetAt:
      quota.networkResetAt ??
      null,

    blockedBy:
      quota.blockedBy ??
      null,
  };
}

async function getPaidStatus(
  userId:
    string,
  plan:
    PaidQuotaPlan
): Promise<AnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan:
        plan,

      userId,
      allowed:
        true,
      available:
        false,
      limit:
        policy.limit,
      remaining:
        null,
      resetAt:
        null,
      deviceCookie:
        null,
    };
  }

  const key =
    paidQuotaKey(
      userId,
      plan
    );

  try {
    const [
      raw,
      ttl,
    ] =
      await Promise.all([
        redis.get(
          key
        ),
        redis.ttl(
          key
        ),
      ]);

    const count =
      countValue(
        raw
      );

    return {
      plan:
        plan,

      userId,

      allowed:
        count <
        policy.limit,

      available:
        true,

      limit:
        policy.limit,

      remaining:
        Math.max(
          0,
          policy.limit -
            count
        ),

      resetAt:
        resetAtFromTtl(
          ttl
        ),

      deviceCookie:
        null,
    };
  } catch {
    /*
     * Quota infrastructure
     * must not take AYZO
     * offline.
     */
    return {
      plan:
        plan,

      userId,
      allowed:
        true,
      available:
        false,
      limit:
        policy.limit,
      remaining:
        null,
      resetAt:
        null,
      deviceCookie:
        null,
    };
  }
}

async function consumePaid(
  userId:
    string,
  plan:
    PaidQuotaPlan
): Promise<AnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan:
        plan,

      userId,

      allowed:
        true,

      available:
        false,

      limit:
        policy.limit,

      remaining:
        null,

      resetAt:
        null,

      deviceCookie:
        null,
    };
  }

  const key =
    paidQuotaKey(
      userId,
      plan
    );

  try {
    const newRaw =
      await redis.incr(
        key
      );

    const count =
      countValue(
        newRaw
      );

    if (
      count ===
      1
    ) {
      await redis.expire(
        key,
        policy
          .windowSeconds
      );
    }

    if (
      count >
      policy.limit
    ) {
      await redis.decr(
        key
      );
    }

    const effectiveCount =
      Math.min(
        count,
        policy.limit
      );

    const ttl =
      await redis.ttl(
        key
      );

    return {
      plan:
        plan,

      userId,

      allowed:
        count <=
        policy.limit,

      available:
        true,

      limit:
        policy.limit,

      remaining:
        Math.max(
          0,
          policy.limit -
            effectiveCount
        ),

      resetAt:
        resetAtFromTtl(
          ttl
        ),

      deviceCookie:
        null,
    };
  } catch {
    return {
      plan:
        plan,

      userId,

      allowed:
        true,

      available:
        false,

      limit:
        policy.limit,

      remaining:
        null,

      resetAt:
        null,

      deviceCookie:
        null,
    };
  }
}

export async function getAnalysisQuotaStatus(
  request:
    Request,
  networkId:
    string | null =
      null
): Promise<AnalysisQuotaState> {
  const {
    entitlement,
    userId,
  } =
    await getServerEntitlement();

  if (
    (
      entitlement.planId ===
        "pro" ||
      entitlement.planId ===
        "advanced"
    ) &&
    userId
  ) {
    return getPaidStatus(
      userId,
      entitlement.planId
    );
  }

  /*
   * Authenticated Free is account-scoped and
   * shares its counter with the mobile app.
   */
  if (userId) {
    const accountFree =
      await getMobileAnalysisQuotaStatus(
        userId,
        "free",
        networkId
      );

    return accountQuotaState(
      userId,
      accountFree
    );
  }

  /*
   * Guest is deliberately device/IP scoped.
   * Guest has only one total analysis, so no
   * additional per-network counter is needed.
   */
  const guest =
    await getFreeQuotaStatus(
      request,
      null
    );

  return {
    ...guest,

    plan:
      "free",

    userId:
      null,

    network:
      null,

    networkLimit:
      null,

    networkRemaining:
      null,

    networkResetAt:
      null,

    blockedBy:
      guest.allowed
        ? null
        : "total",
  };
}

export async function consumeAnalysisQuota(
  request:
    Request,
  networkId:
    string | null =
      null
): Promise<AnalysisQuotaState> {
  const {
    entitlement,
    userId,
  } =
    await getServerEntitlement();

  if (
    (
      entitlement.planId ===
        "pro" ||
      entitlement.planId ===
        "advanced"
    ) &&
    userId
  ) {
    return consumePaid(
      userId,
      entitlement.planId
    );
  }

  if (userId) {
    const accountFree =
      await consumeMobileAnalysisQuota(
        userId,
        "free",
        networkId
      );

    return accountQuotaState(
      userId,
      accountFree
    );
  }

  const guest =
    await consumeFreeAnalysis(
      request,
      null
    );

  return {
    ...guest,

    plan:
      "free",

    userId:
      null,

    network:
      null,

    networkLimit:
      null,

    networkRemaining:
      null,

    networkResetAt:
      null,

    blockedBy:
      guest.allowed
        ? null
        : "total",
  };
}

export async function refundAnalysisQuota(
  request: Request,
  quota: AnalysisQuotaState
): Promise<void> {
  if (
    !quota.available
  ) {
    return;
  }

  if (
    quota.plan === "pro" ||
    quota.plan === "advanced"
  ) {
    const {
      entitlement,
      userId,
    } =
      await getServerEntitlement();

    if (
      entitlement.planId !==
        quota.plan ||
      !userId
    ) {
      return;
    }

    const redis =
      getRedis();

    if (!redis) {
      return;
    }

    const key =
      paidQuotaKey(
        userId,
        quota.plan
      );

    try {
      const raw =
        await redis.get(
          key
        );

      if (
        countValue(raw) >
        0
      ) {
        await redis.decr(
          key
        );
      }
    } catch {
      /*
       * Refund failure must not
       * replace the original
       * analysis response.
       */
    }

    return;
  }

  /*
   * Signed-in Free uses the same user-scoped
   * counter as Android. Refund that account
   * reservation rather than the Guest device/IP
   * counter.
   */
  if (
    quota.plan ===
      "free" &&
    quota.userId
  ) {
    await refundMobileAnalysisQuota(
      quota.userId,
      accountQuotaForRefund(
        quota
      )
    );

    return;
  }

  await refundFreeAnalysis(
    request,
    quota.deviceCookie,
    null
  );
}

export async function refundAnalysisQuotaOnFailure(
  request: Request,
  quota: AnalysisQuotaState | null,
  status: number
): Promise<void> {
  if (
    !quota ||
    status < 400
  ) {
    return;
  }

  await refundAnalysisQuota(
    request,
    quota
  );
}
