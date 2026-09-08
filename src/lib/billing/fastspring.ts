import "server-only";


import {
  PLANS,
} from "@/lib/plans/registry";

import {
  fastSpringCheckoutHost,
  fastSpringModeIsLive,
  parseFastSpringMode,
  type FastSpringMode,
} from "@/lib/billing/fastspringMode";

export type ProBillingInterval =
  | "monthly"
  | "annual";

function proPriceCents(
  interval:
    ProBillingInterval
) {
  const price =
    interval ===
    "annual"
      ? PLANS.pro
          .annualPriceUsd
      : PLANS.pro
          .monthlyPriceUsd;

  if (
    typeof price !==
      "number" ||
    !Number.isFinite(
      price
    )
  ) {
    throw new Error(
      "AYZO Pro price contract is unavailable."
    );
  }

  return Math.round(
    price * 100
  );
}


type FastSpringConfig = {
  username: string;
  password: string;
  checkoutPath: string;
  monthlyProductPath: string;
  annualProductPath: string;
  mode:
    FastSpringMode;
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
    parseFastSpringMode(
      requiredEnv(
        "FASTSPRING_MODE"
      )
    );

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

    mode,
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
    lineItems?:
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
        | "session-not-ready"
        | "legacy-account-lookup"
        | "legacy-session"
        | "legacy-session-not-ready";
    };

function orderTags({
  userId,
  interval,
  expectedPriceCents,
}: {
  userId:
    string;

  interval:
    ProBillingInterval;

  expectedPriceCents:
    number;
}) {
  return {
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
  };
}

function accountIdsFromResponse(
  value: unknown
) {
  const found =
    new Set<string>();

  const add = (
    candidate: unknown
  ) => {
    if (
      typeof candidate ===
        "string" &&
      candidate.trim()
    ) {
      found.add(
        candidate.trim()
      );
    }
  };

  const inspect = (
    candidate: unknown
  ) => {
    if (
      typeof candidate ===
        "string"
    ) {
      add(
        candidate
      );

      return;
    }

    if (
      typeof candidate !==
        "object" ||
      candidate ===
        null
    ) {
      return;
    }

    const record =
      candidate as Record<
        string,
        unknown
      >;

    add(
      record.account
    );

    add(
      record.id
    );
  };

  if (
    Array.isArray(
      value
    )
  ) {
    value.forEach(
      inspect
    );
  }

  if (
    typeof value ===
      "object" &&
    value !==
      null
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    add(
      record.account
    );

    if (
      Array.isArray(
        record.accounts
      )
    ) {
      record.accounts
        .forEach(
          inspect
        );
    }
  }

  return [
    ...found,
  ];
}

function legacySessionProductPaths(
  value: unknown
) {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return [];
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    !Array.isArray(
      record.items
    )
  ) {
    return [];
  }

  return record.items
    .map(item => {
      if (
        typeof item !==
          "object" ||
        item ===
          null
      ) {
        return null;
      }

      const itemRecord =
        item as Record<
          string,
          unknown
        >;

      return typeof itemRecord
        .product ===
        "string"
        ? itemRecord.product
        : null;
    })
    .filter(
      (
        value
      ): value is string =>
        value !==
        null
    );
}

function checkoutStoreId(
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
      2 ||
    !parts[0]
  ) {
    throw new Error(
      "Invalid FastSpring checkout path."
    );
  }

  return parts[0];
}

async function createLegacyTestCheckout({
  config,
  userId,
  userEmail,
  interval,
  productPath,
  expectedPriceCents,
}: {
  config:
    FastSpringConfig;

  userId:
    string;

  userEmail:
    string | null;

  interval:
    ProBillingInterval;

  productPath:
    string;

  expectedPriceCents:
    number;
}): Promise<FastSpringCheckoutResult> {
  /*
   * Sessions v1 is a temporary
   * Preview/Test compatibility
   * path only.
   *
   * Never invent purchaser contact
   * data. Require an existing
   * FastSpring customer account
   * matching the authenticated
   * AYZO email.
   */
  if (
    config.mode !==
      "test" ||
    !userEmail
  ) {
    return {
      ok:
        false,

      providerStatus:
        422,

      stage:
        "legacy-account-lookup",
    };
  }

  const accountQuery =
    new URLSearchParams({
      email:
        userEmail,
    });

  const accountResponse =
    await fastSpringFetch(
      `/accounts?${accountQuery.toString()}`,
      {
        method:
          "GET",
      }
    );

  if (
    accountResponse.status !==
      200
  ) {
    return {
      ok:
        false,

      providerStatus:
        accountResponse.status,

      stage:
        "legacy-account-lookup",
    };
  }

  let accountPayload:
    unknown;

  try {
    accountPayload =
      await accountResponse
        .json();
  } catch {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "legacy-account-lookup",
    };
  }

  const accountIds =
    accountIdsFromResponse(
      accountPayload
    );

  /*
   * Fail closed on both:
   * - no matching provider account
   * - ambiguous provider accounts
   */
  if (
    accountIds.length !==
      1
  ) {
    return {
      ok:
        false,

      providerStatus:
        accountIds.length ===
          0
          ? 404
          : 409,

      stage:
        "legacy-account-lookup",
    };
  }

  const response =
    await fastSpringFetch(
      "/sessions",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            account:
              accountIds[0],

            tags:
              orderTags({
                userId,
                interval,
                expectedPriceCents,
              }),

            items: [
              {
                product:
                  productPath,

                quantity:
                  1,
              },
            ],
          }),
      }
    );

  if (
    response.status !==
      200
  ) {
    return {
      ok:
        false,

      providerStatus:
        response.status,

      stage:
        "legacy-session",
    };
  }

  let session:
    unknown;

  try {
    session =
      await response.json();
  } catch {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "legacy-session-not-ready",
    };
  }

  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "legacy-session-not-ready",
    };
  }

  const record =
    session as Record<
      string,
      unknown
    >;

  const sessionId =
    typeof record.id ===
      "string"
      ? record.id
      : null;

  const products =
    legacySessionProductPaths(
      session
    );

  if (
    !sessionId ||
    !products.includes(
      productPath
    )
  ) {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "legacy-session-not-ready",
    };
  }

  const storeId =
    checkoutStoreId(
      config.checkoutPath
    );

  const checkoutUrl =
    `https://${fastSpringCheckoutHost(
      storeId,
      config.mode
    )}/session/${encodeURIComponent(
      sessionId
    )}`;

  return {
    ok:
      true,

    sessionId,

    checkoutUrl,

    productPath,
  };
}

export async function createProCheckoutSession({
  userId,
  userEmail,
  interval,
}: {
  userId:
    string;

  userEmail:
    string | null;

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
    proPriceCents(
      interval
    );

  /*
   * Primary path:
   * FastSpring Sessions v2.
   *
   * AYZO only accepts the V2
   * session if FastSpring proves
   * the expected product is
   * actually present in the cart.
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
              fastSpringModeIsLive(
                config.mode
              ),

            orderTags:
              orderTags({
                userId,
                interval,
                expectedPriceCents,
              }),

            cart: {
              lineItems: [
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

  let session:
    CreateSessionResponse;

  try {
    session =
      (
        await response.json()
      ) as CreateSessionResponse;
  } catch {
    return {
      ok:
        false,

      providerStatus:
        502,

      stage:
        "create-session",
    };
  }

  const cartItems =
    Array.isArray(
      session.cart?.lineItems
    )
      ? session.cart.lineItems
      : [];

  const products =
    cartItems
      .map(item => {
        if (
          typeof item !==
            "object" ||
          item ===
            null
        ) {
          return null;
        }

        const record =
          item as Record<
            string,
            unknown
          >;

        if (
          typeof record
            .productPath ===
            "string"
        ) {
          return record
            .productPath;
        }

        if (
          typeof record
            .product ===
            "string"
        ) {
          return record
            .product;
        }

        return null;
      })
      .filter(
        (
          value
        ): value is string =>
          value !==
          null
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
      : typeof session
          .checkoutStatus ===
          "string"
        ? [
            session
              .checkoutStatus,
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

  const v2Ready =
    !requiresProducts &&
    cartItems.length >
      0 &&
    containsExpectedProduct;

  if (
    v2Ready
  ) {
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

  /*
   * Keep V2 fail-closed if the
   * provider does not return the
   * expected product in cart.lineItems
   * or otherwise reports the session
   * as not ready for checkout.
   *
   * Only in explicit test mode,
   * attempt the separately verified
   * legacy session compatibility
   * path.
   */
  if (
    config.mode !==
      "test"
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

  return createLegacyTestCheckout({
    config,
    userId,
    userEmail,
    interval,
    productPath,
    expectedPriceCents,
  });
}
