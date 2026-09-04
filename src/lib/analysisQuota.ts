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
  type FreeQuotaState,
} from "@/lib/freeQuota";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";

export type AnalysisQuotaState =
  FreeQuotaState & {
    plan:
      QuotaPlan;
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

function hashUserId(
  userId:
    string
) {
  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      `pro-quota:${userId}`
    )
    .digest("hex");
}

function proQuotaKey(
  userId:
    string
) {
  return (
    "ayzo:quota:v1:pro:user:" +
    hashUserId(
      userId
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

async function getProStatus(
  userId:
    string
): Promise<AnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      "pro"
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan:
        "pro",
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
    proQuotaKey(
      userId
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
        "pro",

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
        "pro",
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

async function consumePro(
  userId:
    string
): Promise<AnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      "pro"
    );

  const redis =
    getRedis();

  if (!redis) {
    return {
      plan:
        "pro",
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
    proQuotaKey(
      userId
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

    const ttl =
      await redis.ttl(
        key
      );

    return {
      plan:
        "pro",

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
    return {
      plan:
        "pro",
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
    Request
): Promise<AnalysisQuotaState> {
  const {
    entitlement,
    userId,
  } =
    await getServerEntitlement();

  if (
    entitlement
      .planId ===
      "pro" &&
    userId
  ) {
    return getProStatus(
      userId
    );
  }

  const free =
    await getFreeQuotaStatus(
      request
    );

  return {
    ...free,
    plan:
      "free",
  };
}

export async function consumeAnalysisQuota(
  request:
    Request
): Promise<AnalysisQuotaState> {
  const {
    entitlement,
    userId,
  } =
    await getServerEntitlement();

  if (
    entitlement
      .planId ===
      "pro" &&
    userId
  ) {
    return consumePro(
      userId
    );
  }

  const free =
    await consumeFreeAnalysis(
      request
    );

  return {
    ...free,
    plan:
      "free",
  };
}
