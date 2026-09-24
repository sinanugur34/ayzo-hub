import {
  createHash,
  randomBytes,
} from "node:crypto";

export const API_KEY_TOKEN_PREFIX =
  "ayzo_live_";

const API_KEY_PATTERN =
  /^ayzo_live_[A-Za-z0-9_-]{43}$/;

export function normalizeApiKeyName(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  if (
    !clean ||
    clean.length > 80
  ) {
    return null;
  }

  return clean;
}

export function isValidApiKeyToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    API_KEY_PATTERN.test(
      value
    )
  );
}

export function hashApiKey(
  token: string
) {
  if (
    !isValidApiKeyToken(
      token
    )
  ) {
    throw new Error(
      "Invalid AYZO API key."
    );
  }

  return createHash(
    "sha256"
  )
    .update(
      token,
      "utf8"
    )
    .digest(
      "hex"
    );
}

export function generateApiKey() {
  const secret =
    randomBytes(
      32
    ).toString(
      "base64url"
    );

  const token =
    `${API_KEY_TOKEN_PREFIX}${secret}`;

  return {
    token,

    keyHash:
      hashApiKey(
        token
      ),

    keyPrefix:
      token.slice(
        0,
        18
      ),
  };
}

export function readApiBearerToken(
  request: Request
) {
  const authorization =
    request.headers
      .get(
        "authorization"
      )
      ?.trim();

  if (!authorization) {
    return null;
  }

  const match =
    /^Bearer\s+(\S+)$/i.exec(
      authorization
    );

  const token =
    match?.[1] ??
    null;

  return isValidApiKeyToken(
    token
  )
    ? token
    : null;
}
