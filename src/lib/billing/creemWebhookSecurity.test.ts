import assert from "node:assert/strict";
import {
  createHmac,
} from "node:crypto";
import test from "node:test";

import {
  verifyCreemSignature,
} from "./creemWebhookSecurity";

test(
  "accepts valid Creem HMAC signature",
  () => {
    const rawBody =
      '{"id":"evt_test"}';

    const secret =
      "test-secret";

    const signature =
      createHmac(
        "sha256",
        secret
      )
        .update(
          rawBody
        )
        .digest(
          "hex"
        );

    assert.equal(
      verifyCreemSignature({
        rawBody,
        signature,
        secret,
      }),
      true
    );
  }
);

test(
  "rejects modified Creem webhook body",
  () => {
    const secret =
      "test-secret";

    const signature =
      createHmac(
        "sha256",
        secret
      )
        .update(
          '{"id":"evt_original"}'
        )
        .digest(
          "hex"
        );

    assert.equal(
      verifyCreemSignature({
        rawBody:
          '{"id":"evt_modified"}',
        signature,
        secret,
      }),
      false
    );
  }
);

test(
  "rejects malformed Creem signature",
  () => {
    assert.equal(
      verifyCreemSignature({
        rawBody:
          "{}",
        signature:
          "not-hex",
        secret:
          "test-secret",
      }),
      false
    );
  }
);
