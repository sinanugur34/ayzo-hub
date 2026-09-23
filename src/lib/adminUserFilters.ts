export type AdminSignupChannel =
  | "web"
  | "android"
  | "ios"
  | "unknown";

export type AdminDeviceClass =
  | "desktop"
  | "phone"
  | "tablet"
  | "unknown";

export type AdminOsFamily =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "other"
  | "unknown";

export type AdminUserFilters = {
  page: number;
  perPage: number;

  emailSearch:
    string |
    null;

  signupChannel:
    AdminSignupChannel |
    null;

  deviceClass:
    AdminDeviceClass |
    null;

  osFamily:
    AdminOsFamily |
    null;

  countryCode:
    string |
    null;

  createdFrom:
    string |
    null;

  createdTo:
    string |
    null;
};

function boundedInteger(
  value:
    string |
    null |
    undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed =
    Number.parseInt(
      value ?? "",
      10
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      parsed
    )
  );
}

function enumValue<
  T extends string
>(
  value:
    string |
    null |
    undefined,
  allowed:
    readonly T[]
): T | null {
  return allowed.includes(
    value as T
  )
    ? value as T
    : null;
}

function countryCode(
  value:
    string |
    null |
    undefined
) {
  if (
    value ===
    "unknown"
  ) {
    return "unknown";
  }

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

function isoDateStart(
  value:
    string |
    null |
    undefined
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date.toISOString();
}

function isoDateExclusiveEnd(
  value:
    string |
    null |
    undefined
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  date.setUTCDate(
    date.getUTCDate() +
    1
  );

  return date.toISOString();
}

export function parseAdminUserFilters(
  params:
    Record<
      string,
      string |
      string[] |
      undefined
    >
): AdminUserFilters {
  const read = (
    key: string
  ) => {
    const value =
      params[key];

    return typeof value ===
      "string"
      ? value
      : null;
  };

  const email =
    read(
      "email"
    )?.trim() ??
    "";

  return {
    page:
      boundedInteger(
        read(
          "page"
        ),
        1,
        1,
        1_000_000
      ),

    perPage:
      boundedInteger(
        read(
          "perPage"
        ),
        50,
        10,
        100
      ),

    emailSearch:
      email
        ? email.slice(
            0,
            254
          )
        : null,

    signupChannel:
      enumValue(
        read(
          "channel"
        ),
        [
          "web",
          "android",
          "ios",
          "unknown",
        ] as const
      ),

    deviceClass:
      enumValue(
        read(
          "device"
        ),
        [
          "desktop",
          "phone",
          "tablet",
          "unknown",
        ] as const
      ),

    osFamily:
      enumValue(
        read(
          "os"
        ),
        [
          "windows",
          "macos",
          "linux",
          "android",
          "ios",
          "other",
          "unknown",
        ] as const
      ),

    countryCode:
      countryCode(
        read(
          "country"
        )
      ),

    createdFrom:
      isoDateStart(
        read(
          "from"
        )
      ),

    createdTo:
      isoDateExclusiveEnd(
        read(
          "to"
        )
      ),
  };
}
