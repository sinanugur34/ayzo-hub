import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(
    import.meta.url
  );

const {
  ALERT_DELIVERY_CLAIM_LIMIT,
  ALERT_DELIVERY_MAX_ATTEMPTS,
  getAlertDeliveryRetryDelaySeconds,
  getAlertDeliveryNextAttemptAt,
  buildAlertDeliveryProviderIdempotencyKey,
} =
  require(
    "./delivery.ts"
  );

test(
  "delivery claim batch is bounded",
  () => {
    assert.equal(
      ALERT_DELIVERY_CLAIM_LIMIT,
      10
    );

    assert.ok(
      ALERT_DELIVERY_CLAIM_LIMIT <=
        25
    );
  }
);

test(
  "delivery attempt ceiling is three",
  () => {
    assert.equal(
      ALERT_DELIVERY_MAX_ATTEMPTS,
      3
    );
  }
);

test(
  "first failure retries after one minute",
  () => {
    assert.equal(
      getAlertDeliveryRetryDelaySeconds(
        1
      ),
      60
    );
  }
);

test(
  "second failure retries after five minutes",
  () => {
    assert.equal(
      getAlertDeliveryRetryDelaySeconds(
        2
      ),
      300
    );
  }
);

test(
  "third failure is terminal",
  () => {
    assert.equal(
      getAlertDeliveryRetryDelaySeconds(
        3
      ),
      null
    );
  }
);

test(
  "next attempt timestamp is deterministic",
  () => {
    const now =
      new Date(
        "2026-09-06T00:00:00.000Z"
      );

    assert.equal(
      getAlertDeliveryNextAttemptAt(
        1,
        now
      ),
      "2026-09-06T00:01:00.000Z"
    );

    assert.equal(
      getAlertDeliveryNextAttemptAt(
        2,
        now
      ),
      "2026-09-06T00:05:00.000Z"
    );

    assert.equal(
      getAlertDeliveryNextAttemptAt(
        3,
        now
      ),
      null
    );
  }
);

test(
  "provider idempotency key is stable",
  () => {
    const id =
      "11111111-1111-4111-8111-111111111111";

    assert.equal(
      buildAlertDeliveryProviderIdempotencyKey(
        id
      ),
      "ayzo-alert-delivery:" +
        id
    );

    assert.equal(
      buildAlertDeliveryProviderIdempotencyKey(
        id.toUpperCase()
      ),
      "ayzo-alert-delivery:" +
        id
    );
  }
);

test(
  "invalid provider idempotency id fails closed",
  () => {
    assert.throws(
      () =>
        buildAlertDeliveryProviderIdempotencyKey(
          "not-a-uuid"
        ),
      /Invalid alert delivery id/
    );
  }
);
