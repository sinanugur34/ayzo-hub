import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import {
  Redis,
} from "@upstash/redis";

import {
  getAnalysisQuotaPolicy,
} from "@/lib/analysisQuotaPolicy";

import {
  getClientIp,
} from "@/lib/rateLimit";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";

import {
  redisRuntimePrefix,
} from "@/lib/redisRuntimeNamespace";

const FREE_POLICY =
  getAnalysisQuotaPolicy(
    "free"
  );

const configuredNetworkLimit =
  FREE_POLICY
    .perNetworkLimit;

if (
  configuredNetworkLimit ===
    null
) {
  throw new Error(
    "Free per-network analysis quota is not configured."
  );
}

export const FREE_ANALYSIS_LIMIT =
  FREE_POLICY.limit;

export const FREE_NETWORK_ANALYSIS_LIMIT:
  number =
    configuredNetworkLimit;

export const FREE_ANALYSIS_WINDOW_SECONDS =
  FREE_POLICY
    .windowSeconds;

export const FREE_DEVICE_COOKIE =
  "ayzo_device";

export const FREE_DEVICE_COOKIE_MAX_AGE =
  365 * 24 * 60 * 60;

type DeviceIdentity = {
  deviceId:
    string;

  deviceCookie:
    string | null;
};

export type FreeQuotaState = {
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

  deviceCookie:
    string | null;

  network?:
    string | null;

  networkLimit?:
    number | null;

  networkRemaining?:
    number | null;

  networkResetAt?:
    number | null;

  blockedBy?:
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

function getSigningSecret() {
  return getInternalApiKey();
}

function signDeviceId(
  deviceId:
    string
) {
  return createHmac(
    "sha256",
    getSigningSecret()
  )
    .update(
      deviceId
    )
    .digest(
      "base64url"
    );
}

function safeEqual(
  a:
    string,
  b:
    string
) {
  const aBuffer =
    Buffer.from(
      a
    );

  const bBuffer =
    Buffer.from(
      b
    );

  if (
    aBuffer.length !==
    bBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    aBuffer,
    bBuffer
  );
}

function getCookieValue(
  request:
    Request,
  name:
    string
) {
  const cookieHeader =
    request.headers.get(
      "cookie"
    );

  if (!cookieHeader) {
    return null;
  }

  for (
    const part of
    cookieHeader.split(
      ";"
    )
  ) {
    const [
      key,
      ...valueParts
    ] =
      part
        .trim()
        .split("=");

    if (
      key ===
      name
    ) {
      return decodeURIComponent(
        valueParts.join(
          "="
        )
      );
    }
  }

  return null;
}

function getDeviceIdentity(
  request:
    Request
): DeviceIdentity {
  const existing =
    getCookieValue(
      request,
      FREE_DEVICE_COOKIE
    );

  if (existing) {
    const separator =
      existing.lastIndexOf(
        "."
      );

    if (
      separator >
      0
    ) {
      const deviceId =
        existing.slice(
          0,
          separator
        );

      const signature =
        existing.slice(
          separator +
            1
        );

      const expected =
        signDeviceId(
          deviceId
        );

      if (
        safeEqual(
          signature,
          expected
        )
      ) {
        return {
          deviceId,
          deviceCookie:
            null,
        };
      }
    }
  }

  const deviceId =
    randomUUID();

  const signature =
    signDeviceId(
      deviceId
    );

  return {
    deviceId,

    deviceCookie:
      `${deviceId}.${signature}`,
  };
}

function hashIdentity(
  type:
    "ip" |
    "device",
  value:
    string
) {
  return createHmac(
    "sha256",
    getSigningSecret()
  )
    .update(
      `${type}:${value}`
    )
    .digest(
      "hex"
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

function getKeys(
  request:
    Request,
  deviceId:
    string
) {
  const ip =
    getClientIp(
      request
    );

  const ipHash =
    hashIdentity(
      "ip",
      ip
    );

  const deviceHash =
    hashIdentity(
      "device",
      deviceId
    );

  const runtimePrefix =
    redisRuntimePrefix();

  return {
    ipKey:
      `ayzo:${runtimePrefix}free:v1:ip:${ipHash}`,

    deviceKey:
      `ayzo:${runtimePrefix}free:v1:device:${deviceHash}`,
  };
}

function getNetworkKeys(
  request:
    Request,
  deviceId:
    string,
  networkId:
    string
) {
  const {
    ipKey,
    deviceKey,
  } =
    getKeys(
      request,
      deviceId
    );

  return {
    ipNetworkKey:
      `${ipKey}:network:${networkId}`,

    deviceNetworkKey:
      `${deviceKey}:network:${networkId}`,
  };
}

function resetAtFromTtls(
  ...ttls:
    number[]
) {
  const positive =
    ttls.filter(
      ttl =>
        Number.isFinite(
          ttl
        ) &&
        ttl >
          0
    );

  if (
    !positive.length
  ) {
    return null;
  }

  return (
    Date.now() +
    Math.max(
      ...positive
    ) *
      1000
  );
}

function unavailableState(
  identity:
    DeviceIdentity,
  networkId:
    string | null
): FreeQuotaState {
  return {
    allowed:
      true,

    available:
      false,

    limit:
      FREE_ANALYSIS_LIMIT,

    remaining:
      null,

    resetAt:
      null,

    deviceCookie:
      identity.deviceCookie,

    network:
      networkId,

    /*
     * The rule remains known even if the
     * Redis counter itself is temporarily
     * unavailable.
     */
    networkLimit:
      FREE_NETWORK_ANALYSIS_LIMIT,

    networkRemaining:
      null,

    networkResetAt:
      null,

    blockedBy:
      null,
  };
}

export async function getFreeQuotaStatus(
  request:
    Request,
  networkId:
    string | null =
      null
): Promise<FreeQuotaState> {
  const identity =
    getDeviceIdentity(
      request
    );

  const redis =
    getRedis();

  if (!redis) {
    return unavailableState(
      identity,
      networkId
    );
  }

  const {
    ipKey,
    deviceKey,
  } =
    getKeys(
      request,
      identity.deviceId
    );

  try {
    const [
      ipRaw,
      deviceRaw,
      ipTtl,
      deviceTtl,
    ] =
      await Promise.all([
        redis.get(
          ipKey
        ),

        redis.get(
          deviceKey
        ),

        redis.ttl(
          ipKey
        ),

        redis.ttl(
          deviceKey
        ),
      ]);

    const ipCount =
      countValue(
        ipRaw
      );

    const deviceCount =
      countValue(
        deviceRaw
      );

    const highestCount =
      Math.max(
        ipCount,
        deviceCount
      );

    let networkCount =
      0;

    let networkResetAt:
      number | null =
        null;

    if (networkId) {
      const {
        ipNetworkKey,
        deviceNetworkKey,
      } =
        getNetworkKeys(
          request,
          identity.deviceId,
          networkId
        );

      const [
        ipNetworkRaw,
        deviceNetworkRaw,
        ipNetworkTtl,
        deviceNetworkTtl,
      ] =
        await Promise.all([
          redis.get(
            ipNetworkKey
          ),

          redis.get(
            deviceNetworkKey
          ),

          redis.ttl(
            ipNetworkKey
          ),

          redis.ttl(
            deviceNetworkKey
          ),
        ]);

      networkCount =
        Math.max(
          countValue(
            ipNetworkRaw
          ),
          countValue(
            deviceNetworkRaw
          )
        );

      networkResetAt =
        resetAtFromTtls(
          ipNetworkTtl,
          deviceNetworkTtl
        );
    }

    const totalBlocked =
      highestCount >=
      FREE_ANALYSIS_LIMIT;

    const networkBlocked =
      networkId !==
        null &&
      networkCount >=
        FREE_NETWORK_ANALYSIS_LIMIT;

    return {
      allowed:
        !totalBlocked &&
        !networkBlocked,

      available:
        true,

      limit:
        FREE_ANALYSIS_LIMIT,

      remaining:
        Math.max(
          0,
          FREE_ANALYSIS_LIMIT -
            highestCount
        ),

      resetAt:
        resetAtFromTtls(
          ipTtl,
          deviceTtl
        ),

      deviceCookie:
        identity.deviceCookie,

      network:
        networkId,

      networkLimit:
        FREE_NETWORK_ANALYSIS_LIMIT,

      networkRemaining:
        networkId
          ? Math.max(
              0,
              FREE_NETWORK_ANALYSIS_LIMIT -
                networkCount
            )
          : null,

      networkResetAt,

      blockedBy:
        totalBlocked
          ? "total"
          : networkBlocked
            ? "network"
            : null,
    };
  } catch {
    /*
     * Quota infrastructure must not take
     * AYZO offline.
     */
    return unavailableState(
      identity,
      networkId
    );
  }
}

export async function consumeFreeAnalysis(
  request:
    Request,
  networkId:
    string | null =
      null
): Promise<FreeQuotaState> {
  const identity =
    getDeviceIdentity(
      request
    );

  const redis =
    getRedis();

  if (!redis) {
    return unavailableState(
      identity,
      networkId
    );
  }

  const {
    ipKey,
    deviceKey,
  } =
    getKeys(
      request,
      identity.deviceId
    );

  const networkKeys =
    networkId
      ? getNetworkKeys(
          request,
          identity.deviceId,
          networkId
        )
      : null;

  try {
    const [
      currentIpRaw,
      currentDeviceRaw,
      currentIpTtl,
      currentDeviceTtl,
    ] =
      await Promise.all([
        redis.get(
          ipKey
        ),

        redis.get(
          deviceKey
        ),

        redis.ttl(
          ipKey
        ),

        redis.ttl(
          deviceKey
        ),
      ]);

    const currentIp =
      countValue(
        currentIpRaw
      );

    const currentDevice =
      countValue(
        currentDeviceRaw
      );

    let currentIpNetwork =
      0;

    let currentDeviceNetwork =
      0;

    let currentIpNetworkTtl =
      -2;

    let currentDeviceNetworkTtl =
      -2;

    if (networkKeys) {
      const result =
        await Promise.all([
          redis.get(
            networkKeys
              .ipNetworkKey
          ),

          redis.get(
            networkKeys
              .deviceNetworkKey
          ),

          redis.ttl(
            networkKeys
              .ipNetworkKey
          ),

          redis.ttl(
            networkKeys
              .deviceNetworkKey
          ),
        ]);

      currentIpNetwork =
        countValue(
          result[0]
        );

      currentDeviceNetwork =
        countValue(
          result[1]
        );

      currentIpNetworkTtl =
        Number(
          result[2]
        );

      currentDeviceNetworkTtl =
        Number(
          result[3]
        );
    }

    const currentTotal =
      Math.max(
        currentIp,
        currentDevice
      );

    const currentNetwork =
      Math.max(
        currentIpNetwork,
        currentDeviceNetwork
      );

    if (
      currentTotal >=
      FREE_ANALYSIS_LIMIT
    ) {
      return {
        allowed:
          false,

        available:
          true,

        limit:
          FREE_ANALYSIS_LIMIT,

        remaining:
          0,

        resetAt:
          resetAtFromTtls(
            currentIpTtl,
            currentDeviceTtl
          ),

        deviceCookie:
          identity.deviceCookie,

        network:
          networkId,

        networkLimit:
          FREE_NETWORK_ANALYSIS_LIMIT,

        networkRemaining:
          networkId
            ? Math.max(
                0,
                FREE_NETWORK_ANALYSIS_LIMIT -
                  currentNetwork
              )
            : null,

        networkResetAt:
          networkId
            ? resetAtFromTtls(
                currentIpNetworkTtl,
                currentDeviceNetworkTtl
              )
            : null,

        blockedBy:
          "total",
      };
    }

    if (
      networkKeys &&
      currentNetwork >=
        FREE_NETWORK_ANALYSIS_LIMIT
    ) {
      return {
        allowed:
          false,

        available:
          true,

        limit:
          FREE_ANALYSIS_LIMIT,

        remaining:
          Math.max(
            0,
            FREE_ANALYSIS_LIMIT -
              currentTotal
          ),

        resetAt:
          resetAtFromTtls(
            currentIpTtl,
            currentDeviceTtl
          ),

        deviceCookie:
          identity.deviceCookie,

        network:
          networkId,

        networkLimit:
          FREE_NETWORK_ANALYSIS_LIMIT,

        networkRemaining:
          0,

        networkResetAt:
          resetAtFromTtls(
            currentIpNetworkTtl,
            currentDeviceNetworkTtl
          ),

        blockedBy:
          "network",
      };
    }

    const increments:
      Promise<unknown>[] = [
        redis.incr(
          ipKey
        ),

        redis.incr(
          deviceKey
        ),
      ];

    if (networkKeys) {
      increments.push(
        redis.incr(
          networkKeys
            .ipNetworkKey
        ),

        redis.incr(
          networkKeys
            .deviceNetworkKey
        )
      );
    }

    const incremented =
      await Promise.all(
        increments
      );

    const newIp =
      countValue(
        incremented[0]
      );

    const newDevice =
      countValue(
        incremented[1]
      );

    const newIpNetwork =
      networkKeys
        ? countValue(
            incremented[2]
          )
        : 0;

    const newDeviceNetwork =
      networkKeys
        ? countValue(
            incremented[3]
          )
        : 0;

    const expiry:
      Promise<unknown>[] =
        [];

    if (
      newIp ===
      1
    ) {
      expiry.push(
        redis.expire(
          ipKey,
          FREE_ANALYSIS_WINDOW_SECONDS
        )
      );
    }

    if (
      newDevice ===
      1
    ) {
      expiry.push(
        redis.expire(
          deviceKey,
          FREE_ANALYSIS_WINDOW_SECONDS
        )
      );
    }

    if (
      networkKeys &&
      newIpNetwork ===
        1
    ) {
      expiry.push(
        redis.expire(
          networkKeys
            .ipNetworkKey,
          FREE_ANALYSIS_WINDOW_SECONDS
        )
      );
    }

    if (
      networkKeys &&
      newDeviceNetwork ===
        1
    ) {
      expiry.push(
        redis.expire(
          networkKeys
            .deviceNetworkKey,
          FREE_ANALYSIS_WINDOW_SECONDS
        )
      );
    }

    await Promise.all(
      expiry
    );

    const [
      ipTtl,
      deviceTtl,
    ] =
      await Promise.all([
        redis.ttl(
          ipKey
        ),

        redis.ttl(
          deviceKey
        ),
      ]);

    let ipNetworkTtl =
      -2;

    let deviceNetworkTtl =
      -2;

    if (networkKeys) {
      [
        ipNetworkTtl,
        deviceNetworkTtl,
      ] =
        await Promise.all([
          redis.ttl(
            networkKeys
              .ipNetworkKey
          ),

          redis.ttl(
            networkKeys
              .deviceNetworkKey
          ),
        ]);
    }

    const highestCount =
      Math.max(
        newIp,
        newDevice
      );

    const highestNetworkCount =
      Math.max(
        newIpNetwork,
        newDeviceNetwork
      );

    const totalExceeded =
      highestCount >
      FREE_ANALYSIS_LIMIT;

    const networkExceeded =
      networkKeys !==
        null &&
      highestNetworkCount >
        FREE_NETWORK_ANALYSIS_LIMIT;

    if (
      totalExceeded ||
      networkExceeded
    ) {
      const rollback:
        Promise<unknown>[] = [
          redis.decr(
            ipKey
          ),

          redis.decr(
            deviceKey
          ),
        ];

      if (networkKeys) {
        rollback.push(
          redis.decr(
            networkKeys
              .ipNetworkKey
          ),

          redis.decr(
            networkKeys
              .deviceNetworkKey
          )
        );
      }

      await Promise.all(
        rollback
      );
    }

    return {
      allowed:
        !totalExceeded &&
        !networkExceeded,

      available:
        true,

      limit:
        FREE_ANALYSIS_LIMIT,

      remaining:
        Math.max(
          0,
          FREE_ANALYSIS_LIMIT -
            Math.min(
              highestCount,
              FREE_ANALYSIS_LIMIT
            )
        ),

      resetAt:
        resetAtFromTtls(
          ipTtl,
          deviceTtl
        ),

      deviceCookie:
        identity.deviceCookie,

      network:
        networkId,

      networkLimit:
        FREE_NETWORK_ANALYSIS_LIMIT,

      networkRemaining:
        networkId
          ? Math.max(
              0,
              FREE_NETWORK_ANALYSIS_LIMIT -
                Math.min(
                  highestNetworkCount,
                  FREE_NETWORK_ANALYSIS_LIMIT
                )
            )
          : null,

      networkResetAt:
        networkId
          ? resetAtFromTtls(
              ipNetworkTtl,
              deviceNetworkTtl
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
      identity,
      networkId
    );
  }
}

export async function refundFreeAnalysis(
  request:
    Request,
  deviceCookie:
    string | null,
  networkId:
    string | null =
      null
): Promise<void> {
  const redis =
    getRedis();

  if (!redis) {
    return;
  }

  let deviceId:
    string |
    null =
      null;

  if (deviceCookie) {
    const separator =
      deviceCookie
        .lastIndexOf(
          "."
        );

    if (
      separator >
      0
    ) {
      deviceId =
        deviceCookie.slice(
          0,
          separator
        );
    }
  }

  if (!deviceId) {
    const identity =
      getDeviceIdentity(
        request
      );

    deviceId =
      identity.deviceId;
  }

  const {
    ipKey,
    deviceKey,
  } =
    getKeys(
      request,
      deviceId
    );

  const networkKeys =
    networkId
      ? getNetworkKeys(
          request,
          deviceId,
          networkId
        )
      : null;

  try {
    const reads:
      Promise<unknown>[] = [
        redis.get(
          ipKey
        ),

        redis.get(
          deviceKey
        ),
      ];

    if (networkKeys) {
      reads.push(
        redis.get(
          networkKeys
            .ipNetworkKey
        ),

        redis.get(
          networkKeys
            .deviceNetworkKey
        )
      );
    }

    const values =
      await Promise.all(
        reads
      );

    const rollback:
      Promise<unknown>[] =
        [];

    if (
      countValue(
        values[0]
      ) >
      0
    ) {
      rollback.push(
        redis.decr(
          ipKey
        )
      );
    }

    if (
      countValue(
        values[1]
      ) >
      0
    ) {
      rollback.push(
        redis.decr(
          deviceKey
        )
      );
    }

    if (
      networkKeys &&
      countValue(
        values[2]
      ) >
        0
    ) {
      rollback.push(
        redis.decr(
          networkKeys
            .ipNetworkKey
        )
      );
    }

    if (
      networkKeys &&
      countValue(
        values[3]
      ) >
        0
    ) {
      rollback.push(
        redis.decr(
          networkKeys
            .deviceNetworkKey
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
