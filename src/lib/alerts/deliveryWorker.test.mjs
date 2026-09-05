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
  buildAlertDeliveryEmailMessage,
  runAlertDeliveryWorker,
} =
  require(
    "./deliveryWorker.ts"
  );

const DELIVERY_ID =
  "11111111-1111-4111-8111-111111111111";

function row(
  overrides = {}
) {
  return {
    id:
      DELIVERY_ID,

    alert_event_id:
      "22222222-2222-4222-8222-222222222222",

    alert_rule_id:
      "33333333-3333-4333-8333-333333333333",

    user_id:
      "44444444-4444-4444-8444-444444444444",

    delivery_channel:
      "email",

    status:
      "processing",

    attempt_count:
      1,

    max_attempts:
      3,

    next_attempt_at:
      null,

    claim_token:
      "55555555-5555-4555-8555-555555555555",

    claimed_at:
      "2026-09-06T00:00:00.000Z",

    last_error_code:
      null,

    last_error_at:
      null,

    provider_message_id:
      null,

    delivered_at:
      null,

    created_at:
      "2026-09-06T00:00:00.000Z",

    updated_at:
      "2026-09-06T00:00:00.000Z",

    ...overrides,
  };
}

function context(
  delivery = row(),
  overrides = {}
) {
  return {
    delivery,

    event: {
      eventType:
        "new_activity",

      evidenceState:
        "SUPPORTED",

      evidenceRefs: [
        {
          ref:
            "tx:test",
        },
      ],

      eventPayload: {
        summary:
          "test",
      },

      detectedAt:
        "2026-09-06T00:00:00.000Z",
    },

    rule: {
      network:
        "ethereum",

      subjectType:
        "wallet",

      subjectValue:
        "0x1234",

      ruleType:
        "new_activity",

      deliveryChannel:
        "email",

      enabled:
        true,
    },

    recipientEmail:
      "USER@EXAMPLE.COM",

    ...overrides,
  };
}

function dependencies({
  rows = [],
  ready = true,
  loadContext,
  sendEmail,
} = {}) {
  const calls = {
    claim:
      0,

    load:
      0,

    send:
      0,

    delivered:
      [],

    retryable:
      [],

    terminal:
      [],
  };

  const deps = {
    isProviderReady:
      async () =>
        ready,

    claim:
      async () => {
        calls.claim +=
          1;

        return {
          claimToken:
            "55555555-5555-4555-8555-555555555555",

          rows,
        };
      },

    loadContext:
      async delivery => {
        calls.load +=
          1;

        return loadContext
          ? loadContext(
              delivery
            )
          : context(
              delivery
            );
      },

    sendEmail:
      async message => {
        calls.send +=
          1;

        return sendEmail
          ? sendEmail(
              message
            )
          : {
              status:
                "delivered",

              providerMessageId:
                `provider-${calls.send}`,
            };
      },

    markDelivered:
      async (
        delivery,
        claimToken,
        providerMessageId
      ) => {
        calls.delivered.push({
          delivery,
          claimToken,
          providerMessageId,
        });
      },

    markRetryableFailed:
      async (
        delivery,
        claimToken,
        errorCode
      ) => {
        calls.retryable.push({
          delivery,
          claimToken,
          errorCode,
        });
      },

    markTerminalFailed:
      async (
        delivery,
        claimToken,
        errorCode
      ) => {
        calls.terminal.push({
          delivery,
          claimToken,
          errorCode,
        });
      },
  };

  return {
    deps,
    calls,
  };
}

test(
  "provider readiness is checked before claim",
  async () => {
    const {
      deps,
      calls,
    } =
      dependencies({
        ready:
          false,

        rows: [
          row(),
        ],
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.skipped,
      true
    );

    assert.equal(
      result.skipReason,
      "provider_not_ready"
    );

    assert.equal(
      result.claimed,
      0
    );

    assert.equal(
      result.providerCalls,
      0
    );

    assert.equal(
      calls.claim,
      0
    );

    assert.equal(
      calls.send,
      0
    );
  }
);

test(
  "email payload is deterministic and privacy bounded",
  () => {
    const message =
      buildAlertDeliveryEmailMessage(
        context()
      );

    assert.equal(
      message.to,
      "user@example.com"
    );

    assert.equal(
      message.subject,
      "AYZO Alert — New activity detected"
    );

    assert.equal(
      message.idempotencyKey,
      `ayzo-alert-delivery:${DELIVERY_ID}`
    );

    assert.match(
      message.text,
      /Network: ethereum/
    );

    assert.match(
      message.text,
      /Evidence state: SUPPORTED/
    );

    assert.match(
      message.text,
      /Evidence references: 1/
    );

    assert.doesNotMatch(
      message.text,
      /tx:test/
    );
  }
);

test(
  "successful provider result finalizes delivery",
  async () => {
    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          row(),
        ],
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.claimed,
      1
    );

    assert.equal(
      result.processed,
      1
    );

    assert.equal(
      result.delivered,
      1
    );

    assert.equal(
      result.providerCalls,
      1
    );

    assert.equal(
      calls.delivered.length,
      1
    );

    assert.equal(
      calls.retryable.length,
      0
    );

    assert.equal(
      calls.terminal.length,
      0
    );
  }
);

test(
  "retryable provider failure schedules retry",
  async () => {
    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          row(),
        ],

        sendEmail:
          async () => ({
            status:
              "retryable_failure",

            errorCode:
              "PROVIDER_TEMPORARY",
          }),
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.retryableFailed,
      1
    );

    assert.equal(
      result.terminalFailed,
      0
    );

    assert.equal(
      calls.retryable.length,
      1
    );

    assert.equal(
      calls.retryable[0]
        .errorCode,
      "PROVIDER_TEMPORARY"
    );
  }
);

test(
  "retryable failure becomes terminal at attempt ceiling",
  async () => {
    const terminalRow =
      row({
        attempt_count:
          3,
      });

    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          terminalRow,
        ],

        sendEmail:
          async () => ({
            status:
              "retryable_failure",

            errorCode:
              "PROVIDER_TEMPORARY",
          }),
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.retryableFailed,
      0
    );

    assert.equal(
      result.terminalFailed,
      1
    );

    assert.equal(
      calls.terminal.length,
      1
    );
  }
);

test(
  "disabled rule is terminal without provider call",
  async () => {
    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          row(),
        ],

        loadContext:
          async delivery =>
            context(
              delivery,
              {
                rule: {
                  ...context(
                    delivery
                  ).rule,

                  enabled:
                    false,
                },
              }
            ),
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.providerCalls,
      0
    );

    assert.equal(
      result.terminalFailed,
      1
    );

    assert.equal(
      calls.send,
      0
    );

    assert.equal(
      calls.terminal[0]
        .errorCode,
      "ALERT_RULE_DISABLED"
    );
  }
);

test(
  "unsupported channel is terminal without provider call",
  async () => {
    const browserRow =
      row({
        delivery_channel:
          "browser",
      });

    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          browserRow,
        ],

        loadContext:
          async delivery =>
            context(
              delivery,
              {
                rule: {
                  ...context(
                    delivery
                  ).rule,

                  deliveryChannel:
                    "browser",
                },
              }
            ),
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.providerCalls,
      0
    );

    assert.equal(
      result.terminalFailed,
      1
    );

    assert.equal(
      calls.send,
      0
    );

    assert.equal(
      calls.terminal[0]
        .errorCode,
      "DELIVERY_CHANNEL_UNSUPPORTED"
    );
  }
);

test(
  "provider processing is sequential",
  async () => {
    let active =
      0;

    let maxActive =
      0;

    const {
      deps,
    } =
      dependencies({
        rows: [
          row(),

          row({
            id:
              "66666666-6666-4666-8666-666666666666",

            alert_event_id:
              "77777777-7777-4777-8777-777777777777",
          }),
        ],

        sendEmail:
          async () => {
            active +=
              1;

            maxActive =
              Math.max(
                maxActive,
                active
              );

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  10
                )
            );

            active -=
              1;

            return {
              status:
                "delivered",

              providerMessageId:
                `provider-${Date.now()}`,
            };
          },
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.delivered,
      2
    );

    assert.equal(
      maxActive,
      1
    );
  }
);

test(
  "context failure becomes retryable failure without provider call",
  async () => {
    const {
      deps,
      calls,
    } =
      dependencies({
        rows: [
          row(),
        ],

        loadContext:
          async () => {
            throw new Error(
              "context unavailable"
            );
          },
      });

    const result =
      await runAlertDeliveryWorker(
        deps
      );

    assert.equal(
      result.errors,
      1
    );

    assert.equal(
      result.providerCalls,
      0
    );

    assert.equal(
      result.retryableFailed,
      1
    );

    assert.equal(
      calls.send,
      0
    );

    assert.equal(
      calls.retryable[0]
        .errorCode,
      "DELIVERY_CONTEXT_UNAVAILABLE"
    );
  }
);
