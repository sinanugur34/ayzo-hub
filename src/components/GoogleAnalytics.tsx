"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = "G-FHVK63YV5E";

type Consent = "granted" | "denied" | null;

export default function GoogleAnalytics() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ayzo_analytics_consent");

    const timer = window.setTimeout(() => {
      if (saved === "granted" || saved === "denied") {
        setConsent(saved);
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function chooseConsent(value: "granted" | "denied") {
    localStorage.setItem("ayzo_analytics_consent", value);
    setConsent(value);
  }

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />

          <Script id="ayzo-ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      {ready && consent === null && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-100">
                Analytics preferences
              </div>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                AYZO uses Google Analytics to understand product usage
                and improve AYZO Hub.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => chooseConsent("denied")}
                className="rounded-full border border-zinc-800 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => chooseConsent("granted")}
                className="rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500"
              >
                Accept analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
