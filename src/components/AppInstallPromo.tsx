"use client";

import Image from "next/image";
import { trackEvent } from "@/lib/analytics/client";
import {
  AYZO_GOOGLE_PLAY_QR,
  AYZO_GOOGLE_PLAY_URL,
} from "@/lib/appStore";
import styles from "./AppInstallPromo.module.css";

type Placement = "research" | "footer" | "home" | "results";

function recordClick(placement: Placement) {
  // Existing analytics layer respects the user's stored consent.
  trackEvent("android_play_store_click", { surface: placement, provider: "google_play" });
}

export function AppStoreInlineLink({
  placement,
}: {
  placement: Extract<Placement, "research" | "footer">;
}) {
  return (
    <a
      href={AYZO_GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordClick(placement)}
      className={styles.inlineLink}
      aria-label="Get the AYZO Android app on Google Play (opens in a new tab)"
    >
      <span aria-hidden="true">▣</span>
      Get the Android app
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function AppInstallPromo({
  placement,
}: {
  placement: Extract<Placement, "home" | "results">;
}) {
  return (
    <section
      data-ayzo-app-install
      data-placement={placement}
      className={styles.promo}
      aria-labelledby="ayzo-app-install-title"
    >
      <div className={styles.copy}>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} aria-hidden="true" />
          AYZO FOR ANDROID · GOOGLE PLAY
        </div>
        <h2 id="ayzo-app-install-title" className={styles.heading}>
          Take your research with you.
        </h2>
        <p className={styles.description}>
          Investigate supported public wallets, tokens and on-chain evidence
          from your Android phone. No wallet connection required.
        </p>
        <div className={styles.actions}>
          <a
            className={styles.primaryLink}
            href={AYZO_GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordClick(placement)}
          >
            Get AYZO on Google Play
            <span aria-hidden="true">↗</span>
          </a>
          <span className={styles.storeMeta}>
            Android app · Free download · Optional in-app purchases
          </span>
        </div>
      </div>
      <div className={styles.desktopQr}>
        <a
          href={AYZO_GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => recordClick(placement)}
          className={styles.qrAnchor}
          aria-label="Open AYZO's verified Google Play app listing"
        >
          <Image
            alt="Scan to open AYZO's Google Play app listing on an Android phone"
            src={AYZO_GOOGLE_PLAY_QR}
            width={152}
            height={152}
            unoptimized
          />
        </a>
        <span className={styles.qrCaption}>Scan with your phone</span>
      </div>
    </section>
  );
}
