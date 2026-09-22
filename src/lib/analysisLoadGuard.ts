import "server-only";

import {
  createHmac,
  randomUUID,
} from "node:crypto";

import {
  Redis,
} from "@upstash/redis";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";

const ACQUIRE_SCRIPT = `
local globalKey = KEYS[1]
local clientKey = KEYS[2]

local now = tonumber(ARGV[1])
local expiresAt = tonumber(ARGV[2])
local globalLimit = tonumber(ARGV[3])
local clientLimit = tonumber(ARGV[4])
local token = ARGV[5]
local ttl = tonumber(ARGV[6])

redis.call("zremrangebyscore", globalKey, "-inf", now)
redis.call("zremrangebyscore", clientKey, "-inf", now)

if redis.call("zcard", globalKey) >= globalLimit then
  return "GLOBAL"
end

if redis.call("zcard", clientKey) >= clientLimit then
  return "CLIENT"
end

redis.call("zadd", globalKey, expiresAt, token)
redis.call("zadd", clientKey, expiresAt, token)

redis.call("expire", globalKey, ttl)
redis.call("expire", clientKey, ttl)

return "OK"
`.trim();

const RELEASE_SCRIPT = `
redis.call("zrem", KEYS[1], ARGV[1])
redis.call("zrem", KEYS[2], ARGV[1])
return 1
`.trim();

let redisClient:
  Redis |
  null = null;

function getRedis() {
  if (redisClient) {
    return redisClient;
  }

  const url =
    process.env.KV_REST_API_URL?.trim();

  const token =
    process.env.KV_REST_API_TOKEN?.trim();

  if (!url || !token) {
    throw new Error(
      "Analysis load guard Redis is not configured."
    );
  }

  redisClient =
    new Redis({
      url,
      token,
    });

  return redisClient;
}

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const numeric =
    Number(raw);

  if (
    !Number.isInteger(numeric) ||
    numeric < min ||
    numeric > max
  ) {
    return fallback;
  }

  return numeric;
}

function hashClientKey(
  value: string
) {
  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      `analysis-load:${value}`
    )
    .digest("hex");
}

export type AnalysisLoadLease = {
  release:
    () => Promise<void>;
};

export async function acquireAnalysisLoadGuard({
  clientKey,
}: {
  clientKey: string;
}): Promise<
  | {
      ok: true;
      lease: AnalysisLoadLease;
    }
  | {
      ok: false;
      reason:
        | "global_busy"
        | "client_busy"
        | "unavailable";
      retryAfterSeconds: number;
    }
> {
  const globalLimit =
    boundedInteger(
      process.env
        .AYZO_ANALYSIS_GLOBAL_CONCURRENCY,
      50,
      1,
      500
    );

  const clientLimit =
    boundedInteger(
      process.env
        .AYZO_ANALYSIS_CLIENT_CONCURRENCY,
      2,
      1,
      10
    );

  const leaseSeconds =
    boundedInteger(
      process.env
        .AYZO_ANALYSIS_LEASE_SECONDS,
      120,
      15,
      600
    );

  const now =
    Date.now();

  const expiresAt =
    now +
    leaseSeconds * 1000;

  const token =
    randomUUID();

  const environment =
    (
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development"
    )
      .trim()
      .toLowerCase();

  const globalKey =
    `ayzo:load:v1:${environment}:analysis:global`;

  const clientRedisKey =
    `ayzo:load:v1:${environment}:analysis:client:${hashClientKey(
      clientKey
    )}`;

  try {
    const result =
      await getRedis().eval(
        ACQUIRE_SCRIPT,
        [
          globalKey,
          clientRedisKey,
        ],
        [
          String(now),
          String(expiresAt),
          String(globalLimit),
          String(clientLimit),
          token,
          String(
            leaseSeconds * 2
          ),
        ]
      );

    if (result === "GLOBAL") {
      return {
        ok: false,
        reason:
          "global_busy",
        retryAfterSeconds:
          3,
      };
    }

    if (result === "CLIENT") {
      return {
        ok: false,
        reason:
          "client_busy",
        retryAfterSeconds:
          3,
      };
    }

    if (result !== "OK") {
      return {
        ok: false,
        reason:
          "unavailable",
        retryAfterSeconds:
          5,
      };
    }

    let released =
      false;

    return {
      ok: true,

      lease: {
        async release() {
          if (released) {
            return;
          }

          released =
            true;

          try {
            await getRedis().eval(
              RELEASE_SCRIPT,
              [
                globalKey,
                clientRedisKey,
              ],
              [
                token,
              ]
            );
          } catch {
            // Lease expiry is final safety net.
          }
        },
      },
    };
  } catch {
    return {
      ok: false,
      reason:
        "unavailable",
      retryAfterSeconds:
        5,
    };
  }
}
