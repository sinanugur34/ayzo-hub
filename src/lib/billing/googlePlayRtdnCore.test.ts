import assert from "node:assert/strict";
import test from "node:test";

import {
  parseGooglePlayRtdnEnvelope,
} from "./googlePlayRtdnCore";

function envelope(
  payload: unknown,
  messageId = "message-1"
) {
  return {
    message: {
      messageId,

      data:
        Buffer.from(
          JSON.stringify(
            payload
          ),
          "utf8"
        ).toString(
          "base64"
        ),
    },
  };
}

test(
  "parses Google Play subscription RTDN",
  () => {
    const result =
      parseGooglePlayRtdnEnvelope(
        envelope({
          version: "1.0",
          packageName:
            "io.ayzo.app",
          eventTimeMillis:
            "1503349566168",

          subscriptionNotification: {
            version: "1.0",
            notificationType: 2,
            purchaseToken:
              "purchase-token-at-least-16",
          },
        })
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.event.kind,
      "subscription"
    );

    if (
      result.event.kind !==
      "subscription"
    ) {
      return;
    }

    assert.equal(
      result.event.notificationType,
      2
    );

    assert.equal(
      result.event.purchaseToken,
      "purchase-token-at-least-16"
    );
  }
);

test(
  "accepts Google Play RTDN test notification",
  () => {
    const result =
      parseGooglePlayRtdnEnvelope(
        envelope({
          version: "1.0",
          packageName:
            "io.ayzo.app",

          testNotification: {
            version: "1.0",
          },
        })
      );

    assert.equal(
      result.ok,
      true
    );

    if (result.ok) {
      assert.equal(
        result.event.kind,
        "test"
      );
    }
  }
);

test(
  "rejects RTDN for another package",
  () => {
    const result =
      parseGooglePlayRtdnEnvelope(
        envelope({
          packageName:
            "com.example.fake",

          testNotification: {
            version: "1.0",
          },
        })
      );

    assert.equal(
      result.ok,
      false
    );
  }
);

test(
  "ignores unsupported Google Play event families",
  () => {
    const result =
      parseGooglePlayRtdnEnvelope(
        envelope({
          packageName:
            "io.ayzo.app",

          oneTimeProductNotification: {
            notificationType: 1,
          },
        })
      );

    assert.equal(
      result.ok,
      true
    );

    if (result.ok) {
      assert.equal(
        result.event.kind,
        "ignored"
      );
    }
  }
);
