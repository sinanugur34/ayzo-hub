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

test(
  "normalizes country code",
  async () => {
    const {
      normalizeSignupCountryCode,
    } =
      await import(
        "./signupSource"
      );

    assert.equal(
      normalizeSignupCountryCode(
        "tr"
      ),
      "TR"
    );

    assert.equal(
      normalizeSignupCountryCode(
        "USA"
      ),
      null
    );

    assert.equal(
      normalizeSignupCountryCode(
        null
      ),
      null
    );
  }
);

test(
  "accepts authentication close to account creation as initial signup",
  async () => {
    const {
      isInitialSignupSession,
    } =
      await import(
        "./signupSource"
      );

    assert.equal(
      isInitialSignupSession({
        createdAt:
          "2026-09-23T10:00:00.000Z",

        lastSignInAt:
          "2026-09-23T10:03:00.000Z",
      }),
      true
    );
  }
);

test(
  "rejects later login from being treated as signup",
  async () => {
    const {
      isInitialSignupSession,
    } =
      await import(
        "./signupSource"
      );

    assert.equal(
      isInitialSignupSession({
        createdAt:
          "2026-09-20T10:00:00.000Z",

        lastSignInAt:
          "2026-09-23T10:00:00.000Z",
      }),
      false
    );
  }
);

test(
  "fails closed when signup timestamps are missing",
  async () => {
    const {
      isInitialSignupSession,
    } =
      await import(
        "./signupSource"
      );

    assert.equal(
      isInitialSignupSession({
        createdAt:
          null,

        lastSignInAt:
          null,
      }),
      false
    );
  }
);
