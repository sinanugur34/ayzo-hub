import {
  Buffer,
} from "node:buffer";

export const MOBILE_DEVICE_TOKEN_HEADER =
  "x-ayzo-device-token";

export const MOBILE_FRESH_AUTH_WINDOW_MS =
  10 * 60 * 1000;

const MAX_BEARER_TOKEN_LENGTH =
  16_384;

const MAX_FUTURE_SKEW_MS =
  60_000;

const ALLOWED_FRESH_AUTH_METHODS =
  new Set([
    "oauth",
    "otp",
  ]);

type JwtPayload =
  Record<
    string,
    unknown
  >;

export function readBearerToken(
  request: Request
) {
  const authorization =
    request.headers
      .get("authorization")
      ?.trim();

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(\S+)$/i
    );

  const token =
    match?.[1] ?? null;

  if (
    !token ||
    token.length >
      MAX_BEARER_TOKEN_LENGTH
  ) {
    return null;
  }

  return token;
}

export function normalizeAuthEmail(
  value:
    string |
    null |
    undefined
) {
  const normalized =
    value
      ?.trim()
      .toLowerCase();

  return normalized || null;
}

function readJwtPayload(
  accessToken:
    string
): JwtPayload | null {
  const parts =
    accessToken.split(
      "."
    );

  if (
    parts.length !==
      3 ||
    !parts[1]
  ) {
    return null;
  }

  try {
    const decoded =
      Buffer.from(
        parts[1],
        "base64url"
      ).toString(
        "utf8"
      );

    const parsed =
      JSON.parse(
        decoded
      );

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(
        parsed
      )
    ) {
      return null;
    }

    return parsed as
      JwtPayload;
  } catch {
    return null;
  }
}

function readAuthenticationTimes(
  payload:
    JwtPayload
) {
  const amr =
    payload.amr;

  if (
    !Array.isArray(
      amr
    )
  ) {
    return [];
  }

  const times:
    number[] = [];

  for (
    const entry of
    amr
  ) {
    if (
      !entry ||
      typeof entry !==
        "object" ||
      Array.isArray(
        entry
      )
    ) {
      continue;
    }

    const record =
      entry as Record<
        string,
        unknown
      >;

    const method =
      record.method;

    const timestamp =
      record.timestamp;

    if (
      typeof method !==
        "string" ||
      !ALLOWED_FRESH_AUTH_METHODS
        .has(
          method
        ) ||
      typeof timestamp !==
        "number" ||
      !Number.isFinite(
        timestamp
      ) ||
      timestamp <=
        0
    ) {
      continue;
    }

    times.push(
      timestamp * 1000
    );
  }

  return times;
}

export function isFreshAuthenticationToken(
  accessToken:
    string,
  now =
    Date.now()
) {
  const payload =
    readJwtPayload(
      accessToken
    );

  if (!payload) {
    return false;
  }

  const sessionId =
    payload.session_id;

  if (
    typeof sessionId !==
      "string" ||
    !sessionId.trim()
  ) {
    return false;
  }

  const authenticationTimes =
    readAuthenticationTimes(
      payload
    );

  if (
    authenticationTimes
      .length ===
    0
  ) {
    return false;
  }

  const mostRecentAuthentication =
    Math.max(
      ...authenticationTimes
    );

  const age =
    now -
    mostRecentAuthentication;

  if (
    age <
    -MAX_FUTURE_SKEW_MS
  ) {
    return false;
  }

  return (
    age <=
    MOBILE_FRESH_AUTH_WINDOW_MS
  );
}


/*
 * Google Play review uses a dedicated,
 * server-created Supabase account with a
 * reusable password.
 *
 * This helper intentionally does NOT widen
 * isFreshAuthenticationToken(), whose normal
 * mobile policy remains OAuth / OTP only.
 */
export function isFreshReviewPasswordAuthenticationToken(
  accessToken:
    string,
  now =
    Date.now()
) {
  const payload =
    readJwtPayload(
      accessToken
    );

  if (!payload) {
    return false;
  }

  const sessionId =
    payload.session_id;

  if (
    typeof sessionId !==
      "string" ||
    !sessionId.trim()
  ) {
    return false;
  }

  const amr =
    payload.amr;

  if (
    !Array.isArray(
      amr
    )
  ) {
    return false;
  }

  const authenticationTimes:
    number[] = [];

  for (
    const entry of
    amr
  ) {
    if (
      !entry ||
      typeof entry !==
        "object" ||
      Array.isArray(
        entry
      )
    ) {
      continue;
    }

    const record =
      entry as Record<
        string,
        unknown
      >;

    if (
      record.method !==
        "password" ||
      typeof record.timestamp !==
        "number" ||
      !Number.isFinite(
        record.timestamp
      ) ||
      record.timestamp <=
        0
    ) {
      continue;
    }

    authenticationTimes.push(
      record.timestamp *
        1000
    );
  }

  if (
    authenticationTimes.length ===
      0
  ) {
    return false;
  }

  const authenticatedAt =
    Math.max(
      ...authenticationTimes
    );

  if (
    authenticatedAt >
      now +
        MAX_FUTURE_SKEW_MS
  ) {
    return false;
  }

  return (
    now -
      authenticatedAt <=
    MOBILE_FRESH_AUTH_WINDOW_MS
  );
}

/*
 * app_metadata is evaluated only after
 * admin.auth.getUser(accessToken) verifies
 * the exact Supabase bearer token.
 *
 * User-controlled user_metadata is never
 * accepted for this purpose.
 */
export function isGooglePlayReviewAccountMetadata(
  value:
    unknown
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return false;
  }

  return (
    (
      value as Record<
        string,
        unknown
      >
    ).ayzo_account_type ===
      "google_play_review"
  );
}
