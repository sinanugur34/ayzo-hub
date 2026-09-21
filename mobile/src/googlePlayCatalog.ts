import type {
  BillingInterval,
  PlanId,
} from "../../src/lib/plans/types";

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

export const GOOGLE_PLAY_PRODUCT_IDS =
  [
    GOOGLE_PLAY_SUBSCRIPTIONS.pro.productId,
    GOOGLE_PLAY_SUBSCRIPTIONS.advanced.productId,
  ] as const;

export function getGooglePlayPlanForProductId(
  productId: string
): PlanId | null {
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
