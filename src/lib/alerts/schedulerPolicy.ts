import {
  timingSafeEqual,
} from "node:crypto";

export const ALERT_SCHEDULER_ENABLE_ENV =
  "AYZO_ALERT_SCHEDULER_ENABLED";

export const ALERT_SCHEDULER_SECRET_ENV =
  "CRON_SECRET";

function parseBearerToken(
  authorization:
    | string
    | null
) {
  if (!authorization) {
    return null;
  }

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization.trim()
    );

  const token =
    match?.[1]?.trim();

  return token || null;
}

export function isAlertSchedulerEnabled(
  value:
    | string
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

export function isValidAlertCronAuthorization(
  authorization:
    | string
    | null,
  secret:
    | string
    | undefined
) {
  const expected =
    secret?.trim();

  const actual =
    parseBearerToken(
      authorization
    );

  if (
    !expected ||
    !actual
  ) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(
      expected,
      "utf8"
    );

  const actualBuffer =
    Buffer.from(
      actual,
      "utf8"
    );

  if (
    expectedBuffer.length !==
    actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actualBuffer,
    expectedBuffer
  );
}
