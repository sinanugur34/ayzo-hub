export type SignupChannel =
  | "web"
  | "android"
  | "ios"
  | "unknown";

export type SignupDeviceClass =
  | "desktop"
  | "phone"
  | "tablet"
  | "unknown";

export type SignupOsFamily =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "other"
  | "unknown";

export type SignupSource = {
  channel:
    SignupChannel;

  deviceClass:
    SignupDeviceClass;

  osFamily:
    SignupOsFamily;
};

function normalizeUa(
  userAgent:
    string |
    null |
    undefined
) {
  return (
    userAgent ??
    ""
  ).toLowerCase();
}

export function detectSignupSourceFromUserAgent(
  userAgent:
    string |
    null |
    undefined,
  channel:
    SignupChannel
): SignupSource {
  const ua =
    normalizeUa(
      userAgent
    );

  let osFamily:
    SignupOsFamily =
      "unknown";

  if (
    /iphone|ipad|ipod/.test(
      ua
    )
  ) {
    osFamily =
      "ios";
  } else if (
    /android/.test(
      ua
    )
  ) {
    osFamily =
      "android";
  } else if (
    /windows/.test(
      ua
    )
  ) {
    osFamily =
      "windows";
  } else if (
    /mac os|macintosh/.test(
      ua
    )
  ) {
    osFamily =
      "macos";
  } else if (
    /linux/.test(
      ua
    )
  ) {
    osFamily =
      "linux";
  } else if (ua) {
    osFamily =
      "other";
  }

  let deviceClass:
    SignupDeviceClass =
      "desktop";

  if (!ua) {
    deviceClass =
      "unknown";
  } else if (
    /ipad|tablet/.test(
      ua
    ) ||
    (
      /android/.test(
        ua
      ) &&
      !/mobile/.test(
        ua
      )
    )
  ) {
    deviceClass =
      "tablet";
  } else if (
    /iphone|ipod|mobile|android/.test(
      ua
    )
  ) {
    deviceClass =
      "phone";
  }

  return {
    channel,
    deviceClass,
    osFamily,
  };
}


export function normalizeSignupCountryCode(
  value:
    string |
    null |
    undefined
) {
  const normalized =
    value
      ?.trim()
      .toUpperCase() ??
    "";

  return /^[A-Z]{2}$/.test(
    normalized
  )
    ? normalized
    : null;
}

export function isInitialSignupSession({
  createdAt,
  lastSignInAt,
}: {
  createdAt:
    string |
    null |
    undefined;

  lastSignInAt:
    string |
    null |
    undefined;
}) {
  if (
    !createdAt ||
    !lastSignInAt
  ) {
    return false;
  }

  const created =
    Date.parse(
      createdAt
    );

  const signedIn =
    Date.parse(
      lastSignInAt
    );

  if (
    !Number.isFinite(
      created
    ) ||
    !Number.isFinite(
      signedIn
    )
  ) {
    return false;
  }

  /*
   * Supabase may create the auth user shortly before
   * the OAuth / OTP callback is completed.
   *
   * Treat only an authentication close to account
   * creation as the initial signup session.
   *
   * This prevents a historical account's later login
   * from being mislabeled as its signup source.
   */
  const MAX_INITIAL_SIGNUP_WINDOW_MS =
    2 *
    60 *
    60 *
    1000;

  const ageAtSignIn =
    signedIn -
    created;

  return (
    ageAtSignIn >= 0 &&
    ageAtSignIn <=
      MAX_INITIAL_SIGNUP_WINDOW_MS
  );
}
