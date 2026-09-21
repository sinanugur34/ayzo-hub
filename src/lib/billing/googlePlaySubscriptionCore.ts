import type {
  BillingInterval,
} from "@/lib/plans/types";

import type {
  SubscriptionStatus,
} from "@/lib/billing/entitlement-core";

import {
  resolveGooglePlayContract,
} from "@/lib/billing/googlePlayContract";

type PaidPlanId =
  "pro" | "advanced";

type RecordValue =
  Record<string, unknown>;

export type VerifiedGooglePlaySubscription = {
  obfuscatedExternalAccountId:
    string | null;

  planId: PaidPlanId;
  billingInterval: BillingInterval;
  productId: string;
  basePlanId: string;

  status: SubscriptionStatus;

  lockedPriceUsdCents: number;

  currentPeriodStart:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;

  shouldAcknowledge:
    boolean;

  testPurchase:
    boolean;
};

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validTimestamp(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(
      Date.parse(value)
    )
  );
}

function subscriptionStatus({
  state,
  expiryTime,
  autoRenewEnabled,
  nowMs,
}: {
  state: string;
  expiryTime: string | null;
  autoRenewEnabled: boolean | null;
  nowMs: number;
}): SubscriptionStatus {
  const future =
    expiryTime !== null &&
    Date.parse(expiryTime) >
      nowMs;

  if (
    state ===
      "SUBSCRIPTION_STATE_PENDING"
  ) {
    return "pending";
  }

  if (
    state ===
      "SUBSCRIPTION_STATE_ON_HOLD"
  ) {
    return "past_due";
  }

  if (
    state ===
      "SUBSCRIPTION_STATE_ACTIVE" ||
    state ===
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  ) {
    if (!future) {
      return "inactive";
    }

    return autoRenewEnabled === false
      ? "canceling"
      : "active";
  }

  if (
    state ===
      "SUBSCRIPTION_STATE_CANCELED"
  ) {
    return future
      ? "canceling"
      : "inactive";
  }

  return "inactive";
}

export function interpretGooglePlaySubscription(
  value: unknown,
  now:
    Date = new Date()
): VerifiedGooglePlaySubscription | null {
  if (!isRecord(value)) {
    return null;
  }

  const state =
    value.subscriptionState;

  if (
    typeof state !== "string"
  ) {
    return null;
  }

  if (
    !Array.isArray(
      value.lineItems
    ) ||
    value.lineItems.length === 0
  ) {
    return null;
  }

  const candidates:
    Array<{
      productId: string;
      basePlanId: string;
      expiryTime: string | null;
      autoRenewEnabled: boolean | null;
      planId: PaidPlanId;
      billingInterval: BillingInterval;
      lockedPriceUsdCents: number;
    }> = [];

  for (
    const item of
      value.lineItems
  ) {
    if (!isRecord(item)) {
      continue;
    }

    const productId =
      item.productId;

    const offerDetails =
      item.offerDetails;

    if (
      typeof productId !==
        "string" ||
      !isRecord(
        offerDetails
      ) ||
      typeof (
        offerDetails
          .basePlanId
      ) !== "string"
    ) {
      continue;
    }

    const basePlanId =
      offerDetails.basePlanId;

    const contract =
      resolveGooglePlayContract({
        productId,
        basePlanId,
      });

    if (!contract) {
      continue;
    }

    const expiryTime =
      validTimestamp(
        item.expiryTime
      )
        ? item.expiryTime
        : null;

    const autoRenewingPlan =
      item.autoRenewingPlan;

    const autoRenewEnabled =
      isRecord(
        autoRenewingPlan
      ) &&
      typeof (
        autoRenewingPlan
          .autoRenewEnabled
      ) === "boolean"
        ? autoRenewingPlan
            .autoRenewEnabled
        : null;

    candidates.push({
      productId,
      basePlanId,
      expiryTime,
      autoRenewEnabled,
      planId:
        contract.planId,
      billingInterval:
        contract.interval,
      lockedPriceUsdCents:
        contract.lockedPriceUsdCents,
    });
  }

  if (
    candidates.length === 0
  ) {
    return null;
  }

  candidates.sort(
    (
      left,
      right
    ) =>
      Date.parse(
        right.expiryTime ??
          ""
      ) -
      Date.parse(
        left.expiryTime ??
          ""
      )
  );

  const selected =
    candidates[0];

  const nowMs =
    now.getTime();

  const status =
    subscriptionStatus({
      state,
      expiryTime:
        selected.expiryTime,
      autoRenewEnabled:
        selected.autoRenewEnabled,
      nowMs,
    });

  const currentPeriodStart =
    validTimestamp(
      value.startTime
    )
      ? value.startTime
      : null;

  const cancelAtPeriodEnd =
    status === "canceling";

  const externalAccountIdentifiers =
    value.externalAccountIdentifiers;

  const obfuscatedExternalAccountId =
    isRecord(
      externalAccountIdentifiers
    ) &&
    typeof (
      externalAccountIdentifiers
        .obfuscatedExternalAccountId
    ) === "string"
      ? externalAccountIdentifiers
          .obfuscatedExternalAccountId
      : null;

  return {
    obfuscatedExternalAccountId,

    planId:
      selected.planId,

    billingInterval:
      selected.billingInterval,

    productId:
      selected.productId,

    basePlanId:
      selected.basePlanId,

    status,

    lockedPriceUsdCents:
      selected
        .lockedPriceUsdCents,

    currentPeriodStart,

    currentPeriodEnd:
      selected.expiryTime,

    cancelAtPeriodEnd,

    shouldAcknowledge:
      value
        .acknowledgementState ===
        "ACKNOWLEDGEMENT_STATE_PENDING" &&
      (
        status === "active" ||
        status === "canceling"
      ),

    testPurchase:
      isRecord(
        value.testPurchase
      ),
  };
}
