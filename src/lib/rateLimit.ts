import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getInternalApiKey } from "@/lib/apiSecurity";

let redisClient: Redis | null = null;

const rateLimiters = new Map<string, Ratelimit>();

function getRedis() {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Rate-limit Redis is not configured.");
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

function getRateLimiter(
  limit: number,
  windowMs: number
) {
  const windowSeconds = Math.max(
    1,
    Math.ceil(windowMs / 1000)
  );

  const cacheKey = `${limit}:${windowSeconds}`;

  const existing = rateLimiters.get(cacheKey);

  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(
      limit,
      `${windowSeconds} s`
    ),
    prefix:
      `ayzo:api:rate:${limit}:${windowSeconds}`,
    analytics: false,
  });

  rateLimiters.set(cacheKey, limiter);

  return limiter;
}

function hashRateLimitKey(key: string) {
  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(key)
    .digest("hex");
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get(
    "x-forwarded-for"
  );

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const limiter = getRateLimiter(
    limit,
    windowMs
  );

  const result = await limiter.limit(
    hashRateLimitKey(key)
  );

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
    retryAfterSeconds: result.success
      ? 0
      : Math.max(
          1,
          Math.ceil(
            (result.reset - Date.now()) / 1000
          )
        ),
  };
}
