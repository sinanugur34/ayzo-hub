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
