import "server-only";

const RESEND_API_URL =
  "https://api.resend.com/emails";

export const WELCOME_EMAIL_FROM_ENV =
  "AYZO_WELCOME_EMAIL_FROM";

type WelcomeEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type WelcomeEmailProviderResult =
  | {
      status:
        "delivered";
      providerMessageId:
        string;
    }
  | {
      status:
        "retryable_failure" |
        "terminal_failure";
      errorCode:
        string;
    };

function config() {
  const apiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  const from =
    process.env
      .AYZO_WELCOME_EMAIL_FROM
      ?.trim();

  return {
    apiKey:
      apiKey || null,

    from:
      from || null,
  };
}

export function isWelcomeEmailProviderReady() {
  const {
    apiKey,
    from,
  } =
    config();

  return Boolean(
    apiKey &&
    from &&
    from.includes("@")
  );
}

async function readJsonSafely(
  response:
    Response
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorName(
  body:
    unknown
) {
  if (
    !body ||
    typeof body !==
      "object" ||
    Array.isArray(body)
  ) {
    return null;
  }

  const value =
    (
      body as {
        name?:
          unknown;
      }
    ).name;

  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : null;
}

function classifyFailure(
  status:
    number,
  body:
    unknown
): WelcomeEmailProviderResult {
  const name =
    errorName(
      body
    );

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
    name ===
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
    name ===
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

export async function sendWelcomeEmail(
  message:
    WelcomeEmailMessage
): Promise<WelcomeEmailProviderResult> {
  const {
    apiKey,
    from,
  } =
    config();

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

  let response:
    Response;

  try {
    response =
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

              html:
                message.html,
            }),
        }
      );
  } catch {
    return {
      status:
        "retryable_failure",
      errorCode:
        "RESEND_NETWORK_ERROR",
    };
  }

  const body =
    await readJsonSafely(
      response
    );

  if (!response.ok) {
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
      body as {
        id?:
          unknown;
      }
    ).id ===
      "string"
      ? (
          body as {
            id:
              string;
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
