import assert from "node:assert/strict";
import test from "node:test";

import {
  detectSignupSourceFromUserAgent,
} from "./signupSource";

test(
  "detects Windows desktop web signup",
  () => {
    const result =
      detectSignupSourceFromUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "web"
      );

    assert.deepEqual(
      result,
      {
        channel:
          "web",
        deviceClass:
          "desktop",
        osFamily:
          "windows",
      }
    );
  }
);

test(
  "detects Android phone",
  () => {
    const result =
      detectSignupSourceFromUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit Mobile",
        "android"
      );

    assert.equal(
      result.channel,
      "android"
    );

    assert.equal(
      result.deviceClass,
      "phone"
    );

    assert.equal(
      result.osFamily,
      "android"
    );
  }
);

test(
  "detects iPad tablet",
  () => {
    const result =
      detectSignupSourceFromUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)",
        "web"
      );

    assert.equal(
      result.deviceClass,
      "tablet"
    );

    assert.equal(
      result.osFamily,
      "ios"
    );
  }
);
