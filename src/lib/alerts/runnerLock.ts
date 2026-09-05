import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  Redis,
} from "@upstash/redis";

import {
  ALERT_RUNNER_LOCK_TTL_SECONDS,
  buildAlertRunnerLockKey,
  type AlertRunnerLeaseProvider,
} from "@/lib/alerts/runnerSafety";

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`.trim();

export class AlertRunnerLockUnavailableError
  extends Error {
  constructor() {
    super(
      "Alert runner lock infrastructure unavailable."
    );

    this.name =
      "AlertRunnerLockUnavailableError";
  }
}

export function createAlertRunnerLeaseProvider():
  AlertRunnerLeaseProvider {
  let redis:
    | Redis
    | undefined;

  function getRedis() {
    if (!redis) {
      redis =
        Redis.fromEnv();
    }

    return redis;
  }

  const lockKey =
    buildAlertRunnerLockKey(
      process.env.VERCEL_ENV ??
        process.env.NODE_ENV,
      process.env.VERCEL_GIT_COMMIT_REF
    );

  return {
    async acquire() {
      const token =
        randomUUID();

      let result:
        | string
        | null;

      try {
        result =
          await getRedis().set(
            lockKey,
            token,
            {
              nx: true,
              ex:
                ALERT_RUNNER_LOCK_TTL_SECONDS,
            }
          );
      } catch {
        throw new AlertRunnerLockUnavailableError();
      }

      if (
        result ===
        null
      ) {
        return null;
      }

      if (
        typeof result !==
          "string" ||
        result.length ===
          0
      ) {
        throw new AlertRunnerLockUnavailableError();
      }

      return {
        async release() {
          try {
            const released =
              await getRedis().eval(
                RELEASE_LOCK_SCRIPT,
                [
                  lockKey,
                ],
                [
                  token,
                ]
              );

            return (
              Number(
                released
              ) === 1
            );
          } catch {
            return false;
          }
        },
      };
    },
  };
}
