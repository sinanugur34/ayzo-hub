import assert from "node:assert/strict";
import test from "node:test";

import {
  createDeviceToken,
  describeDevice,
  DEVICE_TOKEN_BYTES,
  hashDeviceToken,
  hashSecuritySignal,
  MAX_ACTIVE_DEVICES,
} from "./deviceProtection";

test(
  "individual accounts allow two active devices",
  () => {
    assert.equal(
      MAX_ACTIVE_DEVICES,
      2
    );
  }
);

test(
  "device tokens have strong random entropy",
  () => {
    const first =
      createDeviceToken();

    const second =
      createDeviceToken();

    assert.notEqual(
      first,
      second
    );

    assert.ok(
      first.length >=
        DEVICE_TOKEN_BYTES
    );
  }
);

test(
  "raw device token hashes deterministically",
  () => {
    const token =
      "example-device-token";

    const first =
      hashDeviceToken(
        token
      );

    const second =
      hashDeviceToken(
        token
      );

    assert.equal(
      first,
      second
    );

    assert.match(
      first,
      /^[a-f0-9]{64}$/
    );

    assert.notEqual(
      first,
      token
    );
  }
);

test(
  "security signals use keyed hashing",
  () => {
    const first =
      hashSecuritySignal(
        "203.0.113.10",
        "secret-a"
      );

    const second =
      hashSecuritySignal(
        "203.0.113.10",
        "secret-b"
      );

    assert.match(
      first ?? "",
      /^[a-f0-9]{64}$/
    );

    assert.notEqual(
      first,
      second
    );
  }
);

test(
  "empty security signals remain absent",
  () => {
    assert.equal(
      hashSecuritySignal(
        " ",
        "secret"
      ),
      null
    );

    assert.equal(
      hashSecuritySignal(
        null,
        "secret"
      ),
      null
    );
  }
);

test(
  "device descriptions stay bounded and human readable",
  () => {
    assert.equal(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
      ),
      "Chrome on Windows"
    );

    assert.equal(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1"
      ),
      "Safari on iPhone"
    );

    assert.equal(
      describeDevice(
        null
      ),
      "Browser on Unknown device"
    );
  }
);
