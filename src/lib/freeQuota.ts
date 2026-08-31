import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/rateLimit";
import { getInternalApiKey } from "@/lib/apiSecurity";

export const FREE_ANALYSIS_LIMIT = 3;
export const FREE_ANALYSIS_WINDOW_SECONDS = 24 * 60 * 60;

export const FREE_DEVICE_COOKIE = "ayzo_device";
export const FREE_DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

type DeviceIdentity = {
  deviceId: string;
  deviceCookie: string | null;
};

export type FreeQuotaState = {
  allowed: boolean;
  available: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number | null;
  deviceCookie: string | null;
};

let redisClient: Redis | null | undefined;

function getRedis() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

function getSigningSecret() {
  return getInternalApiKey();
}

function signDeviceId(deviceId: string) {
  return createHmac("sha256", getSigningSecret())
    .update(deviceId)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function getDeviceIdentity(request: Request): DeviceIdentity {
  const existing = getCookieValue(
    request,
    FREE_DEVICE_COOKIE
  );

  if (existing) {
    const separator = existing.lastIndexOf(".");

    if (separator > 0) {
      const deviceId = existing.slice(0, separator);
      const signature = existing.slice(separator + 1);

      const expected = signDeviceId(deviceId);

      if (safeEqual(signature, expected)) {
        return {
          deviceId,
          deviceCookie: null,
        };
      }
    }
  }

  const deviceId = randomUUID();
  const signature = signDeviceId(deviceId);

  return {
    deviceId,
    deviceCookie: `${deviceId}.${signature}`,
  };
}

function hashIdentity(
  type: "ip" | "device",
  value: string
) {
  return createHmac("sha256", getSigningSecret())
    .update(`${type}:${value}`)
    .digest("hex");
}

function countValue(value: unknown) {
  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric)
    ? Math.max(0, numeric)
    : 0;
}

function getKeys(request: Request, deviceId: string) {
  const ip = getClientIp(request);

  const ipHash = hashIdentity("ip", ip);
  const deviceHash = hashIdentity(
    "device",
    deviceId
  );

  return {
    ipKey: `ayzo:free:v1:ip:${ipHash}`,
    deviceKey: `ayzo:free:v1:device:${deviceHash}`,
  };
}

function resetAtFromTtls(...ttls: number[]) {
  const positive = ttls.filter(
    (ttl) => Number.isFinite(ttl) && ttl > 0
  );

  if (!positive.length) {
    return null;
  }

  return Date.now() + Math.max(...positive) * 1000;
}

export async function getFreeQuotaStatus(
  request: Request
): Promise<FreeQuotaState> {
  const identity = getDeviceIdentity(request);
  const redis = getRedis();

  if (!redis) {
    return {
      allowed: true,
      available: false,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: null,
      resetAt: null,
      deviceCookie: identity.deviceCookie,
    };
  }

  const { ipKey, deviceKey } = getKeys(
    request,
    identity.deviceId
  );

  try {
    const [
      ipRaw,
      deviceRaw,
      ipTtl,
      deviceTtl,
    ] = await Promise.all([
      redis.get(ipKey),
      redis.get(deviceKey),
      redis.ttl(ipKey),
      redis.ttl(deviceKey),
    ]);

    const ipCount = countValue(ipRaw);
    const deviceCount = countValue(deviceRaw);

    const highestCount = Math.max(
      ipCount,
      deviceCount
    );

    return {
      allowed: highestCount < FREE_ANALYSIS_LIMIT,
      available: true,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: Math.max(
        0,
        FREE_ANALYSIS_LIMIT - highestCount
      ),
      resetAt: resetAtFromTtls(
        ipTtl,
        deviceTtl
      ),
      deviceCookie: identity.deviceCookie,
    };
  } catch {
    // Quota service must not take AYZO offline.
    return {
      allowed: true,
      available: false,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: null,
      resetAt: null,
      deviceCookie: identity.deviceCookie,
    };
  }
}

export async function consumeFreeAnalysis(
  request: Request
): Promise<FreeQuotaState> {
  const identity = getDeviceIdentity(request);
  const redis = getRedis();

  if (!redis) {
    return {
      allowed: true,
      available: false,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: null,
      resetAt: null,
      deviceCookie: identity.deviceCookie,
    };
  }

  const { ipKey, deviceKey } = getKeys(
    request,
    identity.deviceId
  );

  try {
    const [
      currentIpRaw,
      currentDeviceRaw,
      currentIpTtl,
      currentDeviceTtl,
    ] = await Promise.all([
      redis.get(ipKey),
      redis.get(deviceKey),
      redis.ttl(ipKey),
      redis.ttl(deviceKey),
    ]);

    const currentIp = countValue(currentIpRaw);
    const currentDevice = countValue(
      currentDeviceRaw
    );

    if (
      currentIp >= FREE_ANALYSIS_LIMIT ||
      currentDevice >= FREE_ANALYSIS_LIMIT
    ) {
      return {
        allowed: false,
        available: true,
        limit: FREE_ANALYSIS_LIMIT,
        remaining: 0,
        resetAt: resetAtFromTtls(
          currentIpTtl,
          currentDeviceTtl
        ),
        deviceCookie: identity.deviceCookie,
      };
    }

    const [newIpRaw, newDeviceRaw] =
      await Promise.all([
        redis.incr(ipKey),
        redis.incr(deviceKey),
      ]);

    const newIp = countValue(newIpRaw);
    const newDevice = countValue(newDeviceRaw);

    await Promise.all([
      newIp === 1
        ? redis.expire(
            ipKey,
            FREE_ANALYSIS_WINDOW_SECONDS
          )
        : Promise.resolve(0),
      newDevice === 1
        ? redis.expire(
            deviceKey,
            FREE_ANALYSIS_WINDOW_SECONDS
          )
        : Promise.resolve(0),
    ]);

    const [ipTtl, deviceTtl] =
      await Promise.all([
        redis.ttl(ipKey),
        redis.ttl(deviceKey),
      ]);

    const highestCount = Math.max(
      newIp,
      newDevice
    );

    return {
      allowed:
        highestCount <= FREE_ANALYSIS_LIMIT,
      available: true,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: Math.max(
        0,
        FREE_ANALYSIS_LIMIT - highestCount
      ),
      resetAt: resetAtFromTtls(
        ipTtl,
        deviceTtl
      ),
      deviceCookie: identity.deviceCookie,
    };
  } catch {
    return {
      allowed: true,
      available: false,
      limit: FREE_ANALYSIS_LIMIT,
      remaining: null,
      resetAt: null,
      deviceCookie: identity.deviceCookie,
    };
  }
}
