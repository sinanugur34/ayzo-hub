import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  getMobileLiveNetworkIds,
  getMobileNetworkSupport,
} from "./mobileNetworkSupport";

const main =
  readFileSync(
    "mobile/src/main.tsx",
    "utf8"
  );

const styles =
  readFileSync(
    "mobile/src/styles.css",
    "utf8"
  );

const manifest =
  readFileSync(
    "android/app/src/main/AndroidManifest.xml",
    "utf8"
  );

const buildGradle =
  readFileSync(
    "android/app/build.gradle",
    "utf8"
  );

const variables =
  readFileSync(
    "android/variables.gradle",
    "utf8"
  );

const androidStyles =
  readFileSync(
    "android/app/src/main/res/values/styles.xml",
    "utf8"
  );

test(
  "Play mobile exposes exactly thirty canonical live networks",
  () => {
    const live =
      getMobileLiveNetworkIds();

    assert.equal(
      live.length,
      30
    );

    assert.equal(
      live.includes(
        "near"
      ),
      false
    );

    assert.equal(
      getMobileNetworkSupport(
        "near"
      ).analysisEnabled,
      false
    );
  }
);

test(
  "native header derives visible live count from mobile registry",
  () => {
    assert.match(
      main,
      /\{liveNetworks\.length\}\s+LIVE NETWORKS/
    );

    assert.match(
      main,
      /network-live-count/
    );
  }
);

test(
  "native analyzer has mobile-safe input behavior",
  () => {
    assert.match(
      main,
      /autoCapitalize="none"/
    );

    assert.match(
      main,
      /autoCorrect="off"/
    );

    assert.match(
      main,
      /spellCheck=\{false\}/
    );

    assert.match(
      main,
      /enterKeyHint="go"/
    );
  }
);

test(
  "native UI keeps touch and narrow viewport safeguards",
  () => {
    assert.match(
      styles,
      /AYZO MOBILE V3 — NATIVE PLAY EXPERIENCE/
    );

    assert.match(
      styles,
      /min-height:\s*48px/
    );

    assert.match(
      styles,
      /overflow-x:\s*clip/
    );

    assert.match(
      styles,
      /prefers-reduced-motion/
    );
  }
);

test(
  "Android remains API 36 with Google Play Billing 9.1.0",
  () => {
    assert.match(
      variables,
      /compileSdkVersion\s*=\s*36/
    );

    assert.match(
      variables,
      /targetSdkVersion\s*=\s*36/
    );

    assert.match(
      buildGradle,
      /applicationId "io\.ayzo\.app"/
    );

    assert.match(
      buildGradle,
      /billing_version = "9\.1\.0"/
    );
  }
);

test(
  "Android privacy defaults remain restrictive",
  () => {
    assert.match(
      manifest,
      /android:allowBackup="false"/
    );

    assert.match(
      manifest,
      /firebase_analytics_collection_enabled/
    );

    assert.match(
      manifest,
      /google_analytics_adid_collection_enabled/
    );

    assert.match(
      manifest,
      /com\.google\.android\.gms\.permission\.AD_ID/
    );

    assert.match(
      manifest,
      /tools:node="remove"/
    );
  }
);

test(
  "Android launch theme uses canonical dark AYZO splash",
  () => {
    assert.match(
      androidStyles,
      /windowSplashScreenBackground/
    );

    assert.match(
      androidStyles,
      /windowSplashScreenAnimatedIcon/
    );

    assert.match(
      androidStyles,
      /postSplashScreenTheme/
    );

    assert.match(
      androidStyles,
      /@style\/AppTheme\.NoActionBar/
    );
  }
);

test(
  "API27 navigation-bar styling stays outside base values",
  () => {
    const baseStyles =
      readFileSync(
        "android/app/src/main/res/values/styles.xml",
        "utf8"
      );

    const api27Styles =
      readFileSync(
        "android/app/src/main/res/values-v27/styles.xml",
        "utf8"
      );

    assert.doesNotMatch(
      baseStyles,
      /android:windowLightNavigationBar/
    );

    assert.match(
      api27Styles,
      /android:windowLightNavigationBar/
    );

    assert.match(
      baseStyles,
      /AppTheme\.NoActionBarLaunch/
    );

    assert.match(
      api27Styles,
      /AppTheme\.NoActionBarLaunch/
    );
  }
);
