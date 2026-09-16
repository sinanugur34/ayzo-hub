import type {
  PlanId,
} from "@/lib/plans/types";

export type PaidPlan =
  Exclude<
    PlanId,
    "free"
  >;

export type CheckoutAction =
  | "checkout"
  | "same-plan"
  | "downgrade-blocked"
  | "upgrade-confirmation"
  | "upgrade";

export function resolveCheckoutAction({
  currentPlan,
  targetPlan,
  confirmUpgrade,
}: {
  currentPlan:
    PlanId;
  targetPlan:
    PaidPlan;
  confirmUpgrade:
    boolean;
}): CheckoutAction {
  if (
    currentPlan ===
      targetPlan
  ) {
    return "same-plan";
  }

  if (
    currentPlan ===
      "advanced" &&
    targetPlan ===
      "pro"
  ) {
    return "downgrade-blocked";
  }

  if (
    currentPlan ===
      "pro" &&
    targetPlan ===
      "advanced"
  ) {
    return confirmUpgrade
      ? "upgrade"
      : "upgrade-confirmation";
  }

  return "checkout";
}
