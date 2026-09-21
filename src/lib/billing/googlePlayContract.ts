import type {
  BillingInterval,
  PlanId,
} from "@/lib/plans/types";

import {
  PLANS,
} from "@/lib/plans/registry";

type PaidPlanId =
  Exclude<PlanId, "free">;

export const GOOGLE_PLAY_SUBSCRIPTIONS = {
  pro: {
    planId: "pro",
    productId: "ayzo_pro",
    basePlans: {
      monthly: "monthly-v2",
      annual: "annual",
    },
  },

  advanced: {
    planId: "advanced",
    productId: "ayzo_advanced",
    basePlans: {
      monthly: "monthly",
      annual: "annual",
    },
  },
} as const;

export const GOOGLE_PLAY_PRODUCT_IDS = [
  GOOGLE_PLAY_SUBSCRIPTIONS.pro.productId,
  GOOGLE_PLAY_SUBSCRIPTIONS.advanced.productId,
] as const;

export function getGooglePlayPlanForProductId(
  productId: string
): PaidPlanId | null {
  if (
    productId ===
      GOOGLE_PLAY_SUBSCRIPTIONS.pro.productId
  ) {
    return "pro";
  }

  if (
    productId ===
      GOOGLE_PLAY_SUBSCRIPTIONS.advanced.productId
  ) {
    return "advanced";
  }

  return null;
}

export function getGooglePlayIntervalForBasePlanId(
  basePlanId: string
): BillingInterval | null {
  if (
    basePlanId === "monthly" ||
    basePlanId === "monthly-v2"
  ) {
    return "monthly";
  }

  if (basePlanId === "annual") {
    return "annual";
  }

  return null;
}

export function getGooglePlaySubscriptionSelection(
  planId: PlanId,
  interval: BillingInterval
): {
  productId: string;
  basePlanId: string;
} | null {
  if (planId === "free") {
    return null;
  }

  const subscription =
    GOOGLE_PLAY_SUBSCRIPTIONS[planId];

  return {
    productId:
      subscription.productId,
    basePlanId:
      subscription.basePlans[interval],
  };
}

export function resolveGooglePlayContract({
  productId,
  basePlanId,
}: {
  productId: string;
  basePlanId: string;
}): {
  planId: PaidPlanId;
  interval: BillingInterval;
  lockedPriceUsdCents: number;
} | null {
  const planId =
    getGooglePlayPlanForProductId(
      productId
    );

  const interval =
    getGooglePlayIntervalForBasePlanId(
      basePlanId
    );

  if (
    !planId ||
    !interval
  ) {
    return null;
  }

  const expected =
    GOOGLE_PLAY_SUBSCRIPTIONS[
      planId
    ].basePlans[interval];

  if (expected !== basePlanId) {
    return null;
  }

  const plan =
    PLANS[planId];

  const price =
    interval === "monthly"
      ? plan.monthlyPriceUsd
      : plan.annualPriceUsd;

  if (
    price === null ||
    !Number.isFinite(price)
  ) {
    return null;
  }

  return {
    planId,
    interval,
    lockedPriceUsdCents:
      Math.round(price * 100),
  };
}
