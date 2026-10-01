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

import {
  redisRuntimePrefix,
} from "@/lib/redisRuntimeNamespace";

export type MobileAnalysisQuotaState = {
  plan:
    QuotaPlan;

  allowed:
    boolean;

  available:
    boolean;

  limit:
    number;

  remaining:
    number | null;

  resetAt:
    number | null;

  network:
    string | null;

  networkLimit:
    number | null;

  networkRemaining:
    number | null;

  networkResetAt:
    number | null;

  blockedBy:
    "total" |
    "network" |
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

function hashUserId(
  userId:
    string,
  plan:
    QuotaPlan
) {
  /*
   * Historical paid namespaces remain
   * unchanged so existing counters survive
   * this feature.
   */
  const namespace =
    plan ===
      "pro"
      ? "pro-quota"
      : plan ===
          "advanced"
        ? "advanced-quota"
        : "mobile-free-quota";

  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      `${namespace}:${userId}`
    )
    .digest(
      "hex"
    );
}

function quotaKey(
  userId:
    string,
  plan:
    QuotaPlan
) {
  const hash =
    hashUserId(
      userId,
      plan
    );

  if (
    plan ===
      "pro" ||
    plan ===
      "advanced"
  ) {
    return (
      `ayzo:${redisRuntimePrefix()}quota:v1:${plan}:user:` +
      hash
    );
  }

  return (
    `ayzo:${redisRuntimePrefix()}quota:v1:free-mobile:user:` +
    hash
  );
}

function networkQuotaKey(
  userId:
    string,
  networkId:
    string
) {
  return (
    `${quotaKey(
      userId,
      "free"
    )}:network:${networkId}`
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
  return (
    Number.isFinite(
      ttl
    ) &&
    ttl >
      0
  )
    ? Date.now() +
        ttl *
          1000
    : null;
}

function effectiveNetwork(
  plan:
    QuotaPlan,
  networkId:
    string | null,
  perNetworkLimit:
    number | null
) {
  return (
    plan ===
      "free" &&
    networkId &&
    perNetworkLimit !==
      null
  )
    ? networkId
    : null;
}

function unavailableState(
  plan:
    QuotaPlan,
  limit:
    number,
  perNetworkLimit:
    number | null,
  network:
    string | null
): MobileAnalysisQuotaState {
  return {
    plan,

    allowed:
      true,

    available:
      false,

    limit,

    remaining:
      null,

    resetAt:
      null,

    network,

    networkLimit:
      plan ===
        "free"
        ? perNetworkLimit
        : null,

    networkRemaining:
      null,

    networkResetAt:
      null,

    blockedBy:
      null,
  };
}

export async function consumeMobileAnalysisQuota(
  userId:
    string,
  plan:
    QuotaPlan,
  networkId:
    string | null =
      null
): Promise<MobileAnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const network =
    effectiveNetwork(
      plan,
      networkId,
      policy
        .perNetworkLimit
    );

  const redis =
    getRedis();

  if (!redis) {
    return unavailableState(
      plan,
      policy.limit,
      policy
        .perNetworkLimit,
      network
    );
  }

  const key =
    quotaKey(
      userId,
      plan
    );

  const networkKey =
    network
      ? networkQuotaKey(
          userId,
          network
        )
      : null;

  try {
    const [
      currentRaw,
      currentTtl,
    ] =
      await Promise.all([
        redis.get(
          key
        ),

        redis.ttl(
          key
        ),
      ]);

    const current =
      countValue(
        currentRaw
      );

    let currentNetwork =
      0;

    let currentNetworkTtl =
      -2;

    if (networkKey) {
      const values =
        await Promise.all([
          redis.get(
            networkKey
          ),

          redis.ttl(
            networkKey
          ),
        ]);

      currentNetwork =
        countValue(
          values[0]
        );

      currentNetworkTtl =
        Number(
          values[1]
        );
    }

    if (
      current >=
      policy.limit
    ) {
      return {
        plan,

        allowed:
          false,

        available:
          true,

        limit:
          policy.limit,

        remaining:
          0,

        resetAt:
          resetAtFromTtl(
            currentTtl
          ),

        network,

        networkLimit:
          plan ===
            "free"
            ? policy
                .perNetworkLimit
            : null,

        networkRemaining:
          network &&
          policy
            .perNetworkLimit !==
            null
            ? Math.max(
                0,
                policy
                  .perNetworkLimit -
                  currentNetwork
              )
            : null,

        networkResetAt:
          network
            ? resetAtFromTtl(
                currentNetworkTtl
              )
            : null,

        blockedBy:
          "total",
      };
    }

    if (
      networkKey &&
      policy
        .perNetworkLimit !==
        null &&
      currentNetwork >=
        policy
          .perNetworkLimit
    ) {
      return {
        plan,

        allowed:
          false,

        available:
          true,

        limit:
          policy.limit,

        remaining:
          Math.max(
            0,
            policy.limit -
              current
          ),

        resetAt:
          resetAtFromTtl(
            currentTtl
          ),

        network,

        networkLimit:
          policy
            .perNetworkLimit,

        networkRemaining:
          0,

        networkResetAt:
          resetAtFromTtl(
            currentNetworkTtl
          ),

        blockedBy:
          "network",
      };
    }

    const newRaw =
      await redis.incr(
        key
      );

    const count =
      countValue(
        newRaw
      );

    let networkCount =
      0;

    if (networkKey) {
      networkCount =
        countValue(
          await redis.incr(
            networkKey
          )
        );
    }

    const expiry:
      Promise<unknown>[] =
        [];

    if (
      count ===
      1
    ) {
      expiry.push(
        redis.expire(
          key,
          policy
            .windowSeconds
        )
      );
    }

    if (
      networkKey &&
      networkCount ===
        1
    ) {
      expiry.push(
        redis.expire(
          networkKey,
          policy
            .windowSeconds
        )
      );
    }

    await Promise.all(
      expiry
    );

    const ttl =
      await redis.ttl(
        key
      );

    const networkTtl =
      networkKey
        ? await redis.ttl(
            networkKey
          )
        : -2;

    const totalExceeded =
      count >
      policy.limit;

    const networkExceeded =
      networkKey !==
        null &&
      policy
        .perNetworkLimit !==
        null &&
      networkCount >
        policy
          .perNetworkLimit;

    if (
      totalExceeded ||
      networkExceeded
    ) {
      const rollback:
        Promise<unknown>[] = [
          redis.decr(
            key
          ),
        ];

      if (networkKey) {
        rollback.push(
          redis.decr(
            networkKey
          )
        );
      }

      await Promise.all(
        rollback
      );
    }

    return {
      plan,

      allowed:
        !totalExceeded &&
        !networkExceeded,

      available:
        true,

      limit:
        policy.limit,

      remaining:
        Math.max(
          0,
          policy.limit -
            Math.min(
              count,
              policy.limit
            )
        ),

      resetAt:
        resetAtFromTtl(
          ttl
        ),

      network,

      networkLimit:
        plan ===
          "free"
          ? policy
              .perNetworkLimit
          : null,

      networkRemaining:
        network &&
        policy
          .perNetworkLimit !==
          null
          ? Math.max(
              0,
              policy
                .perNetworkLimit -
                Math.min(
                  networkCount,
                  policy
                    .perNetworkLimit
                )
            )
          : null,

      networkResetAt:
        network
          ? resetAtFromTtl(
              networkTtl
            )
          : null,

      blockedBy:
        totalExceeded
          ? "total"
          : networkExceeded
            ? "network"
            : null,
    };
  } catch {
    return unavailableState(
      plan,
      policy.limit,
      policy
        .perNetworkLimit,
      network
    );
  }
}

export async function getMobileAnalysisQuotaStatus(
  userId:
    string,
  plan:
    QuotaPlan,
  networkId:
    string | null =
      null
): Promise<MobileAnalysisQuotaState> {
  const policy =
    getAnalysisQuotaPolicy(
      plan
    );

  const network =
    effectiveNetwork(
      plan,
      networkId,
      policy
        .perNetworkLimit
    );

  const redis =
    getRedis();

  if (!redis) {
    return unavailableState(
      plan,
      policy.limit,
      policy
        .perNetworkLimit,
      network
    );
  }

  const key =
    quotaKey(
      userId,
      plan
    );

  const networkKey =
    network
      ? networkQuotaKey(
          userId,
          network
        )
      : null;

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

    let networkCount =
      0;

    let networkTtl =
      -2;

    if (networkKey) {
      const values =
        await Promise.all([
          redis.get(
            networkKey
          ),

          redis.ttl(
            networkKey
          ),
        ]);

      networkCount =
        countValue(
          values[0]
        );

      networkTtl =
        Number(
          values[1]
        );
    }

    const totalBlocked =
      count >=
      policy.limit;

    const networkBlocked =
      networkKey !==
        null &&
      policy
        .perNetworkLimit !==
        null &&
      networkCount >=
        policy
          .perNetworkLimit;

    return {
      plan,

      allowed:
        !totalBlocked &&
        !networkBlocked,

      available:
        true,

      limit:
        policy.limit,

      remaining:
        Math.max(
          0,
          policy.limit -
            Math.min(
              count,
              policy.limit
            )
        ),

      resetAt:
        count >
          0
          ? resetAtFromTtl(
              ttl
            )
          : null,

      network,

      networkLimit:
        plan ===
          "free"
          ? policy
              .perNetworkLimit
          : null,

      networkRemaining:
        network &&
        policy
          .perNetworkLimit !==
          null
          ? Math.max(
              0,
              policy
                .perNetworkLimit -
                networkCount
            )
          : null,

      networkResetAt:
        networkCount >
          0
          ? resetAtFromTtl(
              networkTtl
            )
          : null,

      blockedBy:
        totalBlocked
          ? "total"
          : networkBlocked
            ? "network"
            : null,
    };
  } catch {
    return unavailableState(
      plan,
      policy.limit,
      policy
        .perNetworkLimit,
      network
    );
  }
}

export async function refundMobileAnalysisQuota(
  userId:
    string,
  quota:
    MobileAnalysisQuotaState
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

  const networkKey =
    quota.plan ===
      "free" &&
    quota.network
      ? networkQuotaKey(
          userId,
          quota.network
        )
      : null;

  try {
    const raw =
      await redis.get(
        key
      );

    const networkRaw =
      networkKey
        ? await redis.get(
            networkKey
          )
        : null;

    const rollback:
      Promise<unknown>[] =
        [];

    if (
      countValue(
        raw
      ) >
      0
    ) {
      rollback.push(
        redis.decr(
          key
        )
      );
    }

    if (
      networkKey &&
      countValue(
        networkRaw
      ) >
        0
    ) {
      rollback.push(
        redis.decr(
          networkKey
        )
      );
    }

    await Promise.all(
      rollback
    );
  } catch {
    /*
     * Refund failure must not replace
     * the original analysis response.
     */
  }
}
