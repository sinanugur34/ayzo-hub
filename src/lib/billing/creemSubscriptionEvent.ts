import type {
  BillingInterval,
} from "@/lib/plans/types";

import type {
  CreemWebhookEvent,
} from "@/lib/billing/creemWebhookPayload";

export type CreemPaidPlan =
  "pro" |
  "advanced";

type ProductContract = {
  productId: string;
  planId:
    CreemPaidPlan;
  interval:
    BillingInterval;
  priceCents:
    number;
};

export type CreemSubscriptionMutation =
  | {
      action:
        "ignore";
    }
  | {
      action:
        "apply";

      userId:
        string;

      providerSubscriptionId:
        string;

      providerCustomerId:
        string;

      planId:
        CreemPaidPlan;

      billingInterval:
        BillingInterval;

      status:
        | "active"
        | "canceling"
        | "past_due"
        | "inactive";

      lockedPriceUsdCents:
        number;

      currentPeriodStart:
        string | null;

      currentPeriodEnd:
        string | null;

      cancelAtPeriodEnd:
        boolean;

      foundingCustomer:
        boolean;
    };

function required(
  name: string
) {
  const value =
    process.env[name]
      ?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}

function contracts():
  readonly ProductContract[] {
  return [
    {
      productId:
        required(
          "CREEM_PRO_MONTHLY_PRODUCT_ID"
        ),
      planId:
        "pro",
      interval:
        "monthly",
      priceCents:
        1900,
    },
    {
      productId:
        required(
          "CREEM_PRO_ANNUAL_PRODUCT_ID"
        ),
      planId:
        "pro",
      interval:
        "annual",
      priceCents:
        19380,
    },
    {
      productId:
        required(
          "CREEM_ADVANCED_MONTHLY_PRODUCT_ID"
        ),
      planId:
        "advanced",
      interval:
        "monthly",
      priceCents:
        6900,
    },
    {
      productId:
        required(
          "CREEM_ADVANCED_ANNUAL_PRODUCT_ID"
        ),
      planId:
        "advanced",
      interval:
        "annual",
      priceCents:
        66200,
    },
  ];
}

function metadataString(
  metadata:
    Record<
      string,
      unknown
    >,
  key: string
) {
  const value =
    metadata[key];

  return typeof value ===
    "string"
    ? value
    : null;
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validDate(
  value:
    string | null
) {
  return (
    value === null ||
    Number.isFinite(
      Date.parse(value)
    )
  );
}

export function interpretCreemSubscriptionEvent(
  event:
    CreemWebhookEvent
): CreemSubscriptionMutation {
  /*
   * Creem explicitly recommends
   * subscription.paid for granting access.
   * subscription.active is synchronization
   * only and therefore intentionally ignored.
   */
  if (
    event.eventType ===
      "subscription.active"
  ) {
    return {
      action:
        "ignore",
    };
  }

  const supported =
    new Set([
      "subscription.paid",
      "subscription.scheduled_cancel",
      "subscription.past_due",
      "subscription.unpaid",
      "subscription.canceled",
      "subscription.expired",
    ]);

  if (
    !supported.has(
      event.eventType
    )
  ) {
    return {
      action:
        "ignore",
    };
  }

  const contract =
    contracts().find(
      row =>
        row.productId ===
          event.object
            .product.id
    );

  if (!contract) {
    throw new Error(
      "CREEM_UNKNOWN_PRODUCT"
    );
  }

  if (
    event.object
      .product.currency !==
      "USD" ||
    event.object
      .product.price !==
      contract.priceCents
  ) {
    throw new Error(
      "CREEM_PRODUCT_CONTRACT_MISMATCH"
    );
  }

  const expectedBillingPeriod =
    contract.interval ===
      "monthly"
      ? "every-month"
      : "every-year";

  if (
    event.object
      .product.billing_period !==
      expectedBillingPeriod
  ) {
    throw new Error(
      "CREEM_BILLING_PERIOD_MISMATCH"
    );
  }

  const metadata =
    event.object
      .metadata;

  const userId =
    metadataString(
      metadata,
      "ayzo_user_id"
    );

  if (
    !userId ||
    !isUuid(
      userId
    )
  ) {
    throw new Error(
      "CREEM_USER_METADATA_INVALID"
    );
  }

  const start =
    event.object
      .current_period_start_date;

  const end =
    event.object
      .current_period_end_date;

  if (
    !validDate(start) ||
    !validDate(end)
  ) {
    throw new Error(
      "CREEM_PERIOD_INVALID"
    );
  }

  let status:
    | "active"
    | "canceling"
    | "past_due"
    | "inactive";

  let cancelAtPeriodEnd =
    false;

  switch (
    event.eventType
  ) {
    case "subscription.paid":
      status =
        "active";

      if (
        !start ||
        !end ||
        Date.parse(end) <=
          Date.parse(start)
      ) {
        throw new Error(
          "CREEM_PAID_PERIOD_REQUIRED"
        );
      }

      break;

    case "subscription.scheduled_cancel":
      status =
        "canceling";

      cancelAtPeriodEnd =
        true;

      if (!end) {
        throw new Error(
          "CREEM_CANCEL_PERIOD_REQUIRED"
        );
      }

      break;

    case "subscription.past_due":
    case "subscription.unpaid":
      status =
        "past_due";
      break;

    case "subscription.canceled":
    case "subscription.expired":
      status =
        "inactive";
      break;

    default:
      return {
        action:
          "ignore",
      };
  }

  return {
    action:
      "apply",

    userId,

    providerSubscriptionId:
      event.object.id,

    providerCustomerId:
      event.object
        .customer.id,

    planId:
      contract.planId,

    billingInterval:
      contract.interval,

    status,

    lockedPriceUsdCents:
      contract.priceCents,

    currentPeriodStart:
      start,

    currentPeriodEnd:
      end,

    cancelAtPeriodEnd,

    foundingCustomer:
      contract.planId ===
        "pro",
  };
}
