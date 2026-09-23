import {
  useEffect,
  useState,
} from "react";

import {
  getMobileAnalyticsConsent,
  identifyMobileAnalyticsUser,
  initializeMobileAnalytics,
  setMobileAnalyticsConsent,
  type MobileAnalyticsConsent,
} from "./mobileAnalytics";

import {
  supabase,
} from "./supabase";

export default function MobileAnalyticsConsentBanner() {
  const [
    consent,
    setConsent,
  ] =
    useState<
      MobileAnalyticsConsent
    >(
      () =>
        getMobileAnalyticsConsent()
    );

  useEffect(
    () => {
      void initializeMobileAnalytics();
    },
    []
  );

  if (
    consent !==
      null
  ) {
    return null;
  }

  async function choose(
    value:
      "granted" |
      "denied"
  ) {
    await setMobileAnalyticsConsent(
      value
    );

    if (
      value ===
      "granted"
    ) {
      try {
        const {
          data,
        } =
          await supabase.auth.getUser();

        if (
          data.user?.id
        ) {
          await identifyMobileAnalyticsUser(
            data.user.id
          );
        }
      } catch {
        // Analytics identity must never interrupt AYZO.
      }
    }

    setConsent(
      value
    );
  }

  return (
    <aside
      className="mobile-analytics-consent"
      aria-label="Analytics preferences"
    >
      <div>
        <strong>
          Analytics preferences
        </strong>

        <span>
          Help AYZO understand feature usage and improve the app.
          Wallet addresses and Ask AYZO question text are not sent to Analytics.
        </span>
      </div>

      <div className="mobile-analytics-consent-actions">
        <button
          type="button"
          onClick={() =>
            void choose(
              "denied"
            )
          }
        >
          Reject
        </button>

        <button
          type="button"
          className="primary"
          onClick={() =>
            void choose(
              "granted"
            )
          }
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
}
