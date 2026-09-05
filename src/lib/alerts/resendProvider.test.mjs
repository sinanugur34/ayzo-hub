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
  isResendAlertProviderReady,
  sendResendAlertEmail,
} =
  require(
    "./resendProvider.ts"
  );

const ORIGINAL_API_KEY =
  process.env
    .RESEND_API_KEY;

const ORIGINAL_FROM =
  process.env
    .AYZO_ALERT_EMAIL_FROM;

const ORIGINAL_FETCH =
  globalThis.fetch;

function configureProvider() {
  process.env
    .RESEND_API_KEY =
    "re_test_only";

  process.env
    .AYZO_ALERT_EMAIL_FROM =
    "AYZO Alerts <alerts@ayzo.test>";
}

function restoreEnvironment() {
  if (
    ORIGINAL_API_KEY ===
      undefined
  ) {
    delete process.env
      .RESEND_API_KEY;
  } else {
    process.env
      .RESEND_API_KEY =
      ORIGINAL_API_KEY;
  }

  if (
    ORIGINAL_FROM ===
      undefined
  ) {
    delete process.env
      .AYZO_ALERT_EMAIL_FROM;
  } else {
    process.env
      .AYZO_ALERT_EMAIL_FROM =
      ORIGINAL_FROM;
  }

  globalThis.fetch =
    ORIGINAL_FETCH;
}

function message() {
  return {
    to:
      "user@example.com",

    subject:
      "AYZO Alert",

    text:
      "Alert body",

    idempotencyKey:
      "ayzo-alert-delivery:11111111-1111-4111-8111-111111111111",
  };
}

test.afterEach(
  restoreEnvironment
);

test(
  "provider readiness fails closed without configuration",
  () => {
    delete process.env
      .RESEND_API_KEY;

    delete process.env
      .AYZO_ALERT_EMAIL_FROM;

    assert.equal(
      isResendAlertProviderReady(),
      false
    );
  }
);

test(
  "provider readiness succeeds with key and sender",
  () => {
    configureProvider();

    assert.equal(
      isResendAlertProviderReady(),
      true
    );
  }
);

test(
  "successful response returns delivered provider id",
  async () => {
    configureProvider();

    let capturedUrl =
      null;

    let capturedOptions =
      null;

    globalThis.fetch =
      async (
        url,
        options
      ) => {
        capturedUrl =
          url;

        capturedOptions =
          options;

        return new Response(
          JSON.stringify({
            id:
              "resend-message-1",
          }),
          {
            status:
              200,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      };

    const result =
      await sendResendAlertEmail(
        message()
      );

    assert.equal(
      result.status,
      "delivered"
    );

    assert.equal(
      result.providerMessageId,
      "resend-message-1"
    );

    assert.equal(
      capturedUrl,
      "https://api.resend.com/emails"
    );

    const headers =
      new Headers(
        capturedOptions
          .headers
      );

    assert.equal(
      headers.get(
        "authorization"
      ),
      "Bearer re_test_only"
    );

    assert.equal(
      headers.get(
        "idempotency-key"
      ),
      message()
        .idempotencyKey
    );

    const body =
      JSON.parse(
        capturedOptions.body
      );

    assert.equal(
      body.from,
      "AYZO Alerts <alerts@ayzo.test>"
    );

    assert.deepEqual(
      body.to,
      [
        "user@example.com",
      ]
    );
  }
);

test(
  "rate limit response is retryable",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          JSON.stringify({
            name:
              "rate_limit_exceeded",
          }),
          {
            status:
              429,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "retryable_failure",

        errorCode:
          "RESEND_RATE_LIMITED",
      }
    );
  }
);

test(
  "server failure is retryable",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          "{}",
          {
            status:
              503,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "retryable_failure",

        errorCode:
          "RESEND_SERVER_ERROR",
      }
    );
  }
);

test(
  "concurrent idempotent request is retryable",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          JSON.stringify({
            name:
              "concurrent_idempotent_requests",
          }),
          {
            status:
              409,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "retryable_failure",

        errorCode:
          "RESEND_IDEMPOTENCY_IN_PROGRESS",
      }
    );
  }
);

test(
  "idempotency payload conflict is terminal",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          JSON.stringify({
            name:
              "invalid_idempotent_request",
          }),
          {
            status:
              409,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "terminal_failure",

        errorCode:
          "RESEND_IDEMPOTENCY_CONFLICT",
      }
    );
  }
);

test(
  "authentication rejection is terminal",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          "{}",
          {
            status:
              401,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "terminal_failure",

        errorCode:
          "RESEND_AUTH_REJECTED",
      }
    );
  }
);

test(
  "successful response without provider id is retryable",
  async () => {
    configureProvider();

    globalThis.fetch =
      async () =>
        new Response(
          "{}",
          {
            status:
              200,
          }
        );

    assert.deepEqual(
      await sendResendAlertEmail(
        message()
      ),
      {
        status:
          "retryable_failure",

        errorCode:
          "RESEND_PROVIDER_ID_MISSING",
      }
    );
  }
);
