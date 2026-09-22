import "server-only";

import {
  createHmac,
} from "node:crypto";
import {
  Redis,
} from "@upstash/redis";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";
import {
  getAnalysisQuotaPolicy,
  type QuotaPlan,
} from "@/lib/analysisQuotaPolicy";

export type MobileAnalysisQuotaState = {
  plan: QuotaPlan;
  allowed: boolean;
  available: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number | null;
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
    process.env.KV_REST_API_URL;

  const token =
    process.env.KV_REST_API_TOKEN;

  if (
    !url ||
    !token
  ) {
    redisClient = null;
    return redisClient;
  }

  redisClient =
    new Redis({
      url,
      token,
    });

  return redisClient;
}

function hashUserId(
  userId: string,
  plan: QuotaPlan
) {
  const namespace =
    plan === "pro"
      ? "pro-quota"
      : plan === "advanced"
        ? "advanced-quota"
        : "mobile-free-quota";

  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      `${namespace}:${userId}`
    )
    .digest("hex");
}

function quotaKey(
  userId: string,
  plan: QuotaPlan
) {
  const hash =
    hashUserId(
      userId,
      plan
    );

  if (
    plan === "pro" ||
    plan === "advanced"
  ) {
    return (
      `ayzo:quota:v1:${plan}:user:` +
      hash
    );
  }

  return (
    "ayzo:quota:v1:free-mobile:user:" +
    hash
  );
}

function countValue(
  value: unknown
) {
  const numeric =
    Number(
      value ?? 0
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
  ttl: number
) {
  return (
    Number.isFinite(ttl) &&
    ttl > 0
  )
    ? Date.now() +
        ttl * 1000
    : null;
}

export async function consumeMobileAnalysisQuota(
  userId: string,
  plan: QuotaPlan
): Promise<MobileAnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan,
      allowed: true,
      available: false,
      limit: policy.limit,
      remaining: null,
      resetAt: null,
    };
  }

  const key =
    quotaKey(
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

    if (count === 1) {
      await redis.expire(
        key,
        policy.windowSeconds
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

    const ttl =
      await redis.ttl(
        key
      );

    const effectiveCount =
      Math.min(
        count,
        policy.limit
      );

    return {
      plan,
      allowed:
        count <=
        policy.limit,
      available: true,
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
    };
  } catch {
    return {
      plan,
      allowed: true,
      available: false,
      limit: policy.limit,
      remaining: null,
      resetAt: null,
    };
  }
}

export async function getMobileAnalysisQuotaStatus(
  userId: string,
  plan: QuotaPlan
): Promise<MobileAnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan,
      allowed: true,
      available: false,
      limit: policy.limit,
      remaining: null,
      resetAt: null,
    };
  }

  const key =
    quotaKey(
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

    const effectiveCount =
      Math.min(
        count,
        policy.limit
      );

    return {
      plan,
      allowed:
        count <
        policy.limit,

      available: true,

      limit:
        policy.limit,

      remaining:
        Math.max(
          0,
          policy.limit -
            effectiveCount
        ),

      resetAt:
        count > 0
          ? resetAtFromTtl(
              ttl
            )
          : null,
    };
  } catch {
    return {
      plan,
      allowed: true,
      available: false,
      limit: policy.limit,
      remaining: null,
      resetAt: null,
    };
  }
}

export async function refundMobileAnalysisQuota(
  userId: string,
  quota: MobileAnalysisQuotaState
) {
  if (
    !quota.available
  ) {
    return;
  }

  const redis =
    getRedis();

  if (!redis) {
    return;
  }

  const key =
    quotaKey(
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
    // Refund failure must not replace
    // the original analysis response.
  }
}
