import type {
  FastSpringWebhookEvent,
} from "@/lib/billing/fastspringWebhookPayload";

export type FastSpringSubscriptionContract = {
  monthlyProductPath:
    string;

  annualProductPath:
    string;

  monthlyPriceCents:
    number;

  annualPriceCents:
    number;
};

export type SubscriptionMutation = {
  userId:
    string;

  providerSubscriptionId:
    string;

  billingInterval:
    "monthly" |
    "annual";

  status:
    "active" |
    "canceling" |
    "inactive";

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

export type SubscriptionInterpretation =
  | {
      action:
        "apply";

      mutation:
        SubscriptionMutation;
    }
  | {
      action:
        "ignore";

      reason:
        string;
    };

function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function stringValue(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function numberValue(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
    ? value
    : null;
}

function timestampIso(
  value:
    unknown
) {
  const timestamp =
    numberValue(
      value
    );

  if (
    timestamp ===
      null ||
    timestamp <=
      0
  ) {
    return null;
  }

  const date =
    new Date(
      timestamp
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function isUuid(
  value:
    string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function extractTags(
  data:
    Record<
      string,
      unknown
    >
) {
  const candidates:
    unknown[] = [
      data.tags,
      data.orderTags,
    ];

  if (
    isRecord(
      data.order
    )
  ) {
    candidates.push(
      data.order.tags,
      data.order
        .orderTags
    );
  }

  for (
    const candidate of
    candidates
  ) {
    if (
      isRecord(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return null;
}

function extractProductPath(
  data:
    Record<
      string,
      unknown
    >
) {
  const direct =
    stringValue(
      data.productPath
    );

  if (direct) {
    return direct;
  }

  if (
    typeof data.product ===
      "string"
  ) {
    return data.product.trim();
  }

  if (
    isRecord(
      data.product
    )
  ) {
    return stringValue(
      data.product.product
    );
  }

  return "";
}

function extractSubscriptionId(
  data:
    Record<
      string,
      unknown
    >
) {
  return (
    stringValue(
      data.subscription
    ) ||
    stringValue(
      data.id
    )
  );
}

function periodEndForEvent(
  type:
    string,
  data:
    Record<
      string,
      unknown
    >
) {
  if (
    type ===
    "subscription.canceled"
  ) {
    return (
      timestampIso(
        data.deactivationDate
      ) ??
      timestampIso(
        data.next
      )
    );
  }

  if (
    type ===
    "subscription.deactivated"
  ) {
    return (
      timestampIso(
        data.deactivationDate
      ) ??
      timestampIso(
        data.changed
      )
    );
  }

  return timestampIso(
    data.next
  );
}

export function interpretFastSpringSubscriptionEvent(
  event:
    FastSpringWebhookEvent,
  contract:
    FastSpringSubscriptionContract
): SubscriptionInterpretation {
  const supported =
    [
      "subscription.activated",
      "subscription.charge.completed",
      "subscription.canceled",
      "subscription.uncanceled",
      "subscription.deactivated",
    ].includes(
      event.type
    );

  if (!supported) {
    return {
      action:
        "ignore",
      reason:
        "unsupported-event",
    };
  }

  const data =
    event.data;

  const tags =
    extractTags(
      data
    );

  if (!tags) {
    return {
      action:
        "ignore",
      reason:
        "missing-ayzo-tags",
    };
  }

  const userId =
    stringValue(
      tags.ayzoUserId
    );

  const plan =
    stringValue(
      tags.ayzoPlan
    );

  const taggedInterval =
    stringValue(
      tags.ayzoBillingInterval
    );

  const taggedPrice =
    stringValue(
      tags.ayzoExpectedPriceCents
    );

  const contractVersion =
    stringValue(
      tags.ayzoContractVersion
    );

  if (
    !isUuid(
      userId
    ) ||
    plan !==
      "pro" ||
    contractVersion !==
      "founding-v1"
  ) {
    return {
      action:
        "ignore",
      reason:
        "invalid-ayzo-contract",
    };
  }

  const productPath =
    extractProductPath(
      data
    );

  let billingInterval:
    "monthly" |
    "annual";

  let expectedPrice:
    number;

  if (
    productPath ===
    contract
      .monthlyProductPath
  ) {
    billingInterval =
      "monthly";

    expectedPrice =
      contract
        .monthlyPriceCents;
  } else if (
    productPath ===
    contract
      .annualProductPath
  ) {
    billingInterval =
      "annual";

    expectedPrice =
      contract
        .annualPriceCents;
  } else {
    return {
      action:
        "ignore",
      reason:
        "unknown-product",
    };
  }

  if (
    taggedInterval !==
      billingInterval ||
    taggedPrice !==
      String(
        expectedPrice
      )
  ) {
    return {
      action:
        "ignore",
      reason:
        "contract-mismatch",
    };
  }

  const providerSubscriptionId =
    extractSubscriptionId(
      data
    );

  if (
    !providerSubscriptionId
  ) {
    return {
      action:
        "ignore",
      reason:
        "missing-subscription-id",
    };
  }

  const currentPeriodStart =
    timestampIso(
      data.begin
    ) ??
    timestampIso(
      data.changed
    );

  const currentPeriodEnd =
    periodEndForEvent(
      event.type,
      data
    );

  if (
    event.type !==
      "subscription.deactivated" &&
    !currentPeriodEnd
  ) {
    /*
     * Never grant paid access
     * without a bounded period.
     */
    return {
      action:
        "ignore",
      reason:
        "missing-period-end",
    };
  }

  let status:
    SubscriptionMutation["status"];

  let cancelAtPeriodEnd:
    boolean;

  switch (
    event.type
  ) {
    case "subscription.canceled":
      status =
        "canceling";
      cancelAtPeriodEnd =
        true;
      break;

    case "subscription.deactivated":
      status =
        "inactive";
      cancelAtPeriodEnd =
        false;
      break;

    default:
      status =
        "active";
      cancelAtPeriodEnd =
        false;
      break;
  }

  return {
    action:
      "apply",

    mutation: {
      userId,

      providerSubscriptionId,

      billingInterval,

      status,

      lockedPriceUsdCents:
        expectedPrice,

      currentPeriodStart,

      currentPeriodEnd,

      cancelAtPeriodEnd,

      foundingCustomer:
        true,
    },
  };
}
