import type {
  AlertDeliveryEmailMessage,
  AlertDeliveryProviderResult,
} from "./deliveryWorker";

const RESEND_API_URL =
  "https://api.resend.com/emails";

export const RESEND_API_KEY_ENV =
  "RESEND_API_KEY";

export const ALERT_EMAIL_FROM_ENV =
  "AYZO_ALERT_EMAIL_FROM";

type ResendSuccessResponse = {
  id?: unknown;
};

type ResendErrorResponse = {
  name?: unknown;
};

function getProviderConfig() {
  const apiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  const from =
    process.env
      .AYZO_ALERT_EMAIL_FROM
      ?.trim();

  return {
    apiKey:
      apiKey || null,

    from:
      from || null,
  };
}

export function isResendAlertProviderReady() {
  const {
    apiKey,
    from,
  } =
    getProviderConfig();

  return (
    Boolean(apiKey) &&
    Boolean(from) &&
    from!.includes("@")
  );
}

async function readJsonSafely(
  response: Response
):
  Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorName(
  body: unknown
) {
  if (
    !body ||
    typeof body !==
      "object" ||
    Array.isArray(body)
  ) {
    return null;
  }

  const name =
    (
      body as
        ResendErrorResponse
    ).name;

  return typeof name ===
    "string"
    ? name
        .trim()
        .toLowerCase()
    : null;
}

function classifyFailure(
  status: number,
  body: unknown
):
  AlertDeliveryProviderResult {
  const errorName =
    getErrorName(body);

  if (
    status === 408
  ) {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_REQUEST_TIMEOUT",
    };
  }

  if (
    status === 429
  ) {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_RATE_LIMITED",
    };
  }

  if (
    status >= 500
  ) {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_SERVER_ERROR",
    };
  }

  if (
    status === 409 &&
    errorName ===
      "concurrent_idempotent_requests"
  ) {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_IDEMPOTENCY_IN_PROGRESS",
    };
  }

  if (
    status === 409 &&
    errorName ===
      "invalid_idempotent_request"
  ) {
    return {
      status:
        "terminal_failure",
      errorCode:
        "RESEND_IDEMPOTENCY_CONFLICT",
    };
  }

  if (
    status === 401 ||
    status === 403
  ) {
    return {
      status:
        "terminal_failure",
      errorCode:
        "RESEND_AUTH_REJECTED",
    };
  }

  return {
    status:
      "terminal_failure",
    errorCode:
      "RESEND_REQUEST_REJECTED",
  };
}

export async function sendResendAlertEmail(
  message:
    AlertDeliveryEmailMessage
):
  Promise<AlertDeliveryProviderResult> {
  const {
    apiKey,
    from,
  } =
    getProviderConfig();

  if (
    !apiKey ||
    !from
  ) {
    return {
      status:
        "terminal_failure",
      errorCode:
        "RESEND_NOT_CONFIGURED",
    };
  }

  const response =
    await fetch(
      RESEND_API_URL,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            message
              .idempotencyKey,
        },

        body:
          JSON.stringify({
            from,

            to: [
              message.to,
            ],

            subject:
              message.subject,

            text:
              message.text,
          }),
      }
    );

  const body =
    await readJsonSafely(
      response
    );

  if (
    !response.ok
  ) {
    return classifyFailure(
      response.status,
      body
    );
  }

  const providerMessageId =
    body &&
    typeof body ===
      "object" &&
    !Array.isArray(body) &&
    typeof (
      body as
        ResendSuccessResponse
    ).id ===
      "string"
      ? (
          body as
            {
              id: string;
            }
        ).id.trim()
      : "";

  if (
    !providerMessageId
  ) {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_PROVIDER_ID_MISSING",
    };
  }

  return {
    status:
      "delivered",

    providerMessageId,
  };
}
