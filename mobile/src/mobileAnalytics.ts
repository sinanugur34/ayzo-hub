import {
  Capacitor,
  registerPlugin,
} from "@capacitor/core";

export type MobileAnalyticsConsent =
  | "granted"
  | "denied"
  | null;

export type MobileAnalyticsValue =
  | string
  | number
  | boolean;

export type MobileAnalyticsParams =
  Record<
    string,
    MobileAnalyticsValue
  >;

const CONSENT_KEY =
  "ayzo:mobile:analytics-consent:v1";

type AyzoAnalyticsPlugin = {
  setCollectionEnabled(
    options: {
      enabled: boolean;
    }
  ): Promise<{
    enabled: boolean;
  }>;

  setUserId(
    options: {
      userId: string;
    }
  ): Promise<void>;

  clearUserId():
    Promise<void>;

  logEvent(
    options: {
      name: string;
      params?: MobileAnalyticsParams;
    }
  ): Promise<void>;
};

const AyzoAnalytics =
  registerPlugin<
    AyzoAnalyticsPlugin
  >(
    "AyzoAnalytics"
  );

function available() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() ===
      "android"
  );
}

export function getMobileAnalyticsConsent():
  MobileAnalyticsConsent {
  const value =
    localStorage.getItem(
      CONSENT_KEY
    );

  if (
    value === "granted" ||
    value === "denied"
  ) {
    return value;
  }

  return null;
}

export async function initializeMobileAnalytics() {
  if (!available()) {
    return;
  }

  const consent =
    getMobileAnalyticsConsent();

  try {
    await AyzoAnalytics
      .setCollectionEnabled({
        enabled:
          consent ===
          "granted",
      });
  } catch {
    // Analytics must never interrupt AYZO.
  }
}

export async function setMobileAnalyticsConsent(
  consent:
    Exclude<
      MobileAnalyticsConsent,
      null
    >
) {
  localStorage.setItem(
    CONSENT_KEY,
    consent
  );

  if (!available()) {
    return;
  }

  try {
    await AyzoAnalytics
      .setCollectionEnabled({
        enabled:
          consent ===
          "granted",
      });

    if (
      consent ===
      "denied"
    ) {
      await AyzoAnalytics
        .clearUserId();
    }
  } catch {
    // Analytics must never interrupt AYZO.
  }
}

async function analyticsUserId(
  userId: string
) {
  const bytes =
    new TextEncoder()
      .encode(
        "ayzo:analytics:user:v1\0" +
        userId
      );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return Array.from(
    new Uint8Array(
      digest
    )
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}

export async function identifyMobileAnalyticsUser(
  userId: string
) {
  if (
    !available() ||
    getMobileAnalyticsConsent() !==
      "granted"
  ) {
    return;
  }

  try {
    await AyzoAnalytics
      .setUserId({
        userId:
          await analyticsUserId(
            userId
          ),
      });
  } catch {
    // Analytics must never interrupt AYZO.
  }
}

export async function clearMobileAnalyticsUser() {
  if (!available()) {
    return;
  }

  try {
    await AyzoAnalytics
      .clearUserId();
  } catch {
    // Analytics must never interrupt AYZO.
  }
}

export async function trackMobileEvent(
  name: string,
  params:
    MobileAnalyticsParams = {}
) {
  if (
    !available() ||
    getMobileAnalyticsConsent() !==
      "granted"
  ) {
    return;
  }

  try {
    await AyzoAnalytics
      .logEvent({
        name,
        params,
      });
  } catch {
    // Analytics must never interrupt AYZO.
  }
}
