import "server-only";

export type ProBillingInterval =
  | "monthly"
  | "annual";

type FastSpringConfig = {
  username: string;
  password: string;
  checkoutPath: string;
  monthlyProductPath: string;
  annualProductPath: string;
  mode: "test";
};

function requiredEnv(
  name: string
) {
  const value =
    process.env[
      name
    ]?.trim();

  if (!value) {
    throw new Error(
      `Missing server configuration: ${name}`
    );
  }

  return value;
}

export function getFastSpringConfig():
  FastSpringConfig {
  const mode =
    requiredEnv(
      "FASTSPRING_MODE"
    );

  if (
    mode !==
    "test"
  ) {
    throw new Error(
      "FastSpring live mode is not enabled."
    );
  }

  return {
    username:
      requiredEnv(
        "FASTSPRING_API_USERNAME"
      ),

    password:
      requiredEnv(
        "FASTSPRING_API_PASSWORD"
      ),

    checkoutPath:
      requiredEnv(
        "FASTSPRING_CHECKOUT_PATH"
      ),

    monthlyProductPath:
      requiredEnv(
        "FASTSPRING_PRO_MONTHLY_PATH"
      ),

    annualProductPath:
      requiredEnv(
        "FASTSPRING_PRO_ANNUAL_PATH"
      ),

    mode:
      "test",
  };
}

function checkoutPathForUrl(
  value: string
) {
  const parts =
    value
      .split("/")
      .map(
        part =>
          part.trim()
      )
      .filter(Boolean);

  if (
    parts.length !==
    2
  ) {
    throw new Error(
      "Invalid FastSpring checkout path."
    );
  }

  return parts
    .map(
      encodeURIComponent
    )
    .join("/");
}

function basicAuth(
  username: string,
  password: string
) {
  return (
    "Basic " +
    Buffer.from(
      `${username}:${password}`
    ).toString(
      "base64"
    )
  );
}

async function fastSpringFetch(
  path: string,
  init:
    RequestInit
) {
  const config =
    getFastSpringConfig();

  return fetch(
    `https://api.fastspring.com${path}`,
    {
      ...init,

      headers: {
        Authorization:
          basicAuth(
            config.username,
            config.password
          ),

        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        "User-Agent":
          "AYZO/1.0",

        ...(init.headers ??
          {}),
      },

      cache:
        "no-store",
    }
  );
}

type CreateSessionResponse = {
  id?: unknown;

  checkoutUrls?: {
    webcheckoutUrl?:
      unknown;
  };

  checkoutStatus?:
    unknown;

  cart?: {
    items?:
      unknown;
  };
};

export type FastSpringCheckoutResult =
  | {
      ok: true;
      sessionId:
        string;
      checkoutUrl:
        string;
      productPath:
        string;
    }
  | {
      ok: false;
      providerStatus:
        number;
      stage:
        | "create-session"
          | "session-not-ready";
    };

export async function createProCheckoutSession({
  userId,
  interval,
}: {
  userId:
    string;
  interval:
    ProBillingInterval;
}): Promise<FastSpringCheckoutResult> {
  const config =
    getFastSpringConfig();

  const checkoutPath =
    checkoutPathForUrl(
      config.checkoutPath
    );

  const productPath =
    interval ===
    "annual"
      ? config
          .annualProductPath
      : config
          .monthlyProductPath;

  const expectedPriceCents =
    interval ===
    "annual"
      ? 19380
      : 1900;

  /*
   * Create the complete session
   * in one provider request.
   *
   * Avoid the separate cart-item
   * POST which currently returns
   * an internal FastSpring 500.
   */
  const response =
    await fastSpringFetch(
      `/v2/checkouts/${checkoutPath}/sessions`,
      {
        method:
          "POST",

        body:
          JSON.stringify({
            live:
              false,

            orderTags: {
              ayzoUserId:
                userId,

              ayzoPlan:
                "pro",

              ayzoBillingInterval:
                interval,

              ayzoExpectedPriceCents:
                String(
                  expectedPriceCents
                ),

              ayzoContractVersion:
                "founding-v1",
            },

            cart: {
              items: [
                {
                  productPath,
                  quantity:
                    1,
                },
              ],
            },
          }),
      }
    );

  if (
    response.status !==
    201
  ) {
    return {
      ok:
        false,

      providerStatus:
        response.status,

      stage:
        "create-session",
    };
  }

  const session =
    (
      await response.json()
    ) as CreateSessionResponse;

  const cartItems =
    Array.isArray(
      session.cart?.items
    )
      ? session.cart.items
      : [];

  const products =
    cartItems
      .map(item => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          return null;
        }

        const record =
          item as Record<
            string,
            unknown
          >;

        if (
          typeof record.productPath ===
          "string"
        ) {
          return record.productPath;
        }

        if (
          typeof record.product ===
          "string"
        ) {
          return record.product;
        }

        return null;
      })
      .filter(
        (
          value
        ): value is string =>
          value !== null
      );
const sessionId =
    typeof session.id ===
      "string"
      ? session.id
      : null;

  const checkoutUrl =
    typeof session
      .checkoutUrls
      ?.webcheckoutUrl ===
      "string"
      ? session
          .checkoutUrls
          .webcheckoutUrl
      : null;

    const checkoutStatuses =
      Array.isArray(
        session.checkoutStatus
      )
        ? session.checkoutStatus.filter(
            (
              value
            ): value is string =>
              typeof value ===
              "string"
          )
        : typeof session.checkoutStatus ===
            "string"
          ? [
              session.checkoutStatus,
            ]
          : [];

    const requiresProducts =
      checkoutStatuses.includes(
        "PRODUCTS_REQUIRED"
      );

    const containsExpectedProduct =
      products.includes(
        productPath
      );

    /*
     * FastSpring can return HTTP 201
     * and a checkout URL for a session
     * whose cart is not actually ready.
     * AYZO must fail closed.
     */
    if (
      requiresProducts ||
      cartItems.length ===
        0 ||
      !containsExpectedProduct
    ) {
      return {
        ok:
          false,

        providerStatus:
          response.status,

        stage:
          "session-not-ready",
      };
    }

  if (
    !sessionId ||
    !checkoutUrl
  ) {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "create-session",
    };
  }

  return {
    ok:
      true,

    sessionId,

    checkoutUrl,

    productPath,
  };
}
