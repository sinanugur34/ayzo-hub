import {
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

export const DEVICE_COOKIE_NAME =
  "ayzo_device";

export const DEVICE_TOKEN_BYTES =
  32;

export const MAX_ACTIVE_DEVICES =
  2;

export function createDeviceToken() {
  return randomBytes(
    DEVICE_TOKEN_BYTES
  ).toString(
    "base64url"
  );
}

export function isValidDeviceToken(
  token: string
) {
  /*
   * 32 random bytes encoded with base64url
   * without padding always produces
   * exactly 43 characters.
   */
  return /^[A-Za-z0-9_-]{43}$/.test(
    token
  );
}

export function assertValidDeviceToken(
  token: string
) {
  if (
    !isValidDeviceToken(
      token
    )
  ) {
    throw new Error(
      "INVALID_DEVICE_TOKEN"
    );
  }
}


export function hashDeviceToken(
  token: string
) {
  assertValidDeviceToken(
    token
  );

  return createHash(
    "sha256"
  )
    .update(
      token
    )
    .digest(
      "hex"
    );
}

export function hashSecuritySignal(
  value: string | null,
  secret: string
) {
  const normalized =
    value
      ?.trim();

  if (!normalized) {
    return null;
  }

  return createHmac(
    "sha256",
    secret
  )
    .update(
      normalized
    )
    .digest(
      "hex"
    );
}

export function describeDevice(
  userAgent:
    string | null
) {
  const ua =
    userAgent ?? "";

  let browser =
    "Browser";

  if (
    /Edg\//i.test(
      ua
    )
  ) {
    browser =
      "Microsoft Edge";
  } else if (
    /OPR\//i.test(
      ua
    )
  ) {
    browser =
      "Opera";
  } else if (
    /Chrome\//i.test(
      ua
    )
  ) {
    browser =
      "Chrome";
  } else if (
    /Firefox\//i.test(
      ua
    )
  ) {
    browser =
      "Firefox";
  } else if (
    /Safari\//i.test(
      ua
    )
  ) {
    browser =
      "Safari";
  }

  let platform =
    "Unknown device";

  if (
    /Windows/i.test(
      ua
    )
  ) {
    platform =
      "Windows";
  } else if (
    /iPhone/i.test(
      ua
    )
  ) {
    platform =
      "iPhone";
  } else if (
    /iPad/i.test(
      ua
    )
  ) {
    platform =
      "iPad";
  } else if (
    /Android/i.test(
      ua
    )
  ) {
    platform =
      "Android";
  } else if (
    /Macintosh|Mac OS X/i.test(
      ua
    )
  ) {
    platform =
      "Mac";
  } else if (
    /Linux/i.test(
      ua
    )
  ) {
    platform =
      "Linux";
  }

  return `${browser} on ${platform}`;
}
