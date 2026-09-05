import "server-only";

import {
  Redis,
} from "@upstash/redis";

import {
  ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
  buildAlertSchedulerCadenceKey,
} from "@/lib/alerts/schedulerCostPolicy";

export class AlertSchedulerCadenceUnavailableError
  extends Error {
  constructor() {
    super(
      "Alert scheduler cadence infrastructure unavailable."
    );

    this.name =
      "AlertSchedulerCadenceUnavailableError";
  }
}

export async function claimAlertSchedulerCadence():
  Promise<boolean> {
  const url =
    process.env.KV_REST_API_URL
      ?.trim();

  const token =
    process.env.KV_REST_API_TOKEN
      ?.trim();

  if (
    !url ||
    !token
  ) {
    throw new AlertSchedulerCadenceUnavailableError();
  }

  const redis =
    new Redis({
      url,
      token,
    });

  const key =
    buildAlertSchedulerCadenceKey(
      process.env.VERCEL_ENV ??
        process.env.NODE_ENV,
      process.env.VERCEL_GIT_COMMIT_REF
    );

  try {
    const result =
      await redis.set(
        key,
        "claimed",
        {
          nx: true,
          ex:
            ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
        }
      );

    if (
      result ===
      null
    ) {
      return false;
    }

    if (
      typeof result !==
        "string" ||
      result.length ===
        0
    ) {
      throw new AlertSchedulerCadenceUnavailableError();
    }

    return true;
  } catch (error) {
    if (
      error instanceof
      AlertSchedulerCadenceUnavailableError
    ) {
      throw error;
    }

    throw new AlertSchedulerCadenceUnavailableError();
  }
}
