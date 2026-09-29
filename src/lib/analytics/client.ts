type AnalyticsValue =
  | string
  | number
  | boolean;

type AnalyticsParams =
  Record<
    string,
    AnalyticsValue
  >;

type AnalyticsWindow =
  Window & {
    gtag?: (
      ...args: unknown[]
    ) => void;
  };

const CONSENT_KEY =
  "ayzo_analytics_consent";

const SESSION_KEY =
  "ayzo_product_analytics_session_v1";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function analyticsAllowed() {
  try {
    return (
      window.localStorage
        .getItem(
          CONSENT_KEY
        ) ===
      "granted"
    );
  } catch {
    return false;
  }
}

function analyticsSessionId() {
  try {
    const existing =
      window.sessionStorage
        .getItem(
          SESSION_KEY
        );

    if (
      existing &&
      UUID.test(
        existing
      )
    ) {
      return existing;
    }

    if (
      typeof crypto
        .randomUUID !==
        "function"
    ) {
      return null;
    }

    const created =
      crypto.randomUUID();

    window.sessionStorage
      .setItem(
        SESSION_KEY,
        created
      );

    return created;
  } catch {
    return null;
  }
}

function recordFirstPartyEvent(
  name:
    string,

  params:
    AnalyticsParams
) {
  const sessionId =
    analyticsSessionId();

  if (!sessionId) {
    return;
  }

  void fetch(
    "/api/analytics/event",
    {
      method:
        "POST",

      credentials:
        "same-origin",

      keepalive:
        true,

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          eventName:
            name,

          sessionId,

          properties:
            params,
        }),
    }
  ).catch(
    () => undefined
  );
}

export function getAnalyticsAttributionSessionId() {
  if (
    typeof window ===
      "undefined" ||
    !analyticsAllowed()
  ) {
    return null;
  }

  return analyticsSessionId();
}

export function trackEvent(
  name: string,
  params:
    AnalyticsParams = {}
) {
  if (
    typeof window ===
    "undefined" ||
    !analyticsAllowed()
  ) {
    return;
  }

  (
    window as AnalyticsWindow
  ).gtag?.(
    "event",
    name,
    params
  );

  recordFirstPartyEvent(
    name,
    params
  );
}
