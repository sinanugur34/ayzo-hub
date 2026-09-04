import assert from "node:assert/strict";

import {
  createHmac,
} from "node:crypto";

import test from "node:test";

import {
  parseFastSpringWebhookPayload,
} from "@/lib/billing/fastspringWebhookPayload";

import {
  verifyFastSpringSignature,
} from "@/lib/billing/fastspringWebhookSecurity";

const secret =
  "ayzo-test-secret";

const rawBody =
  JSON.stringify({
    events: [
      {
        id:
          "evt-ayzo-test",
        live:
          false,
        processed:
          false,
        type:
          "subscription.activated",
        created:
          1788510000000,
        data: {
          subscription:
            "sub-ayzo-test",
        },
      },
    ],
  });

const signature =
  createHmac(
    "sha256",
    secret
  )
    .update(
      rawBody,
      "utf8"
    )
    .digest(
      "base64"
    );

test(
  "accepts valid FastSpring HMAC signature",
  () => {
    assert.equal(
      verifyFastSpringSignature({
        rawBody,
        signature,
        secret,
      }),
      true
    );
  }
);

test(
  "rejects modified payload",
  () => {
    assert.equal(
      verifyFastSpringSignature({
        rawBody:
          rawBody +
          " ",
        signature,
        secret,
      }),
      false
    );
  }
);

test(
  "parses FastSpring batch payload",
  () => {
    const result =
      parseFastSpringWebhookPayload(
        rawBody
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.payload
        .events.length,
      1
    );

    assert.equal(
      result.payload
        .events[0]
        .type,
      "subscription.activated"
    );
  }
);
