import type {
  BasicAlertRuleType,
} from "@/lib/account/alertRules";

import {
  resolveAccountEntitlement,
  type SubscriptionEntitlementRow,
} from "@/lib/billing/entitlement-core";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";


export const MAX_ALERT_RULES_PER_RUN =
  2;


export type AlertEvaluationRule = {
  id:
    string;

  userId:
    string;

  network:
    string;

  subjectType:
    string;

  subjectValue:
    string;

  ruleType:
    BasicAlertRuleType;

  enabled:
    boolean;
};


export type AlertEvaluationTarget = {
  network:
    string;

  subjectType:
    string;

  subjectValue:
    string;
};


type SubscriptionWithUser =
  SubscriptionEntitlementRow & {
    userId:
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
    value !== null &&
    !Array.isArray(value)
  );
}


function parseSubscription(
  value:
    unknown
): SubscriptionWithUser | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.user_id !==
      "string" ||
    (
      value.plan_id !==
        "pro" &&
      value.plan_id !==
        "advanced"
    ) ||
    (
      value.billing_interval !==
        "monthly" &&
      value.billing_interval !==
        "annual"
    ) ||
    (
      value.status !==
        "pending" &&
      value.status !==
        "active" &&
      value.status !==
        "canceling" &&
      value.status !==
        "past_due" &&
      value.status !==
        "inactive"
    ) ||
    typeof value
      .locked_price_usd_cents !==
      "number" ||
    (
      value.current_period_end !==
        null &&
      typeof value
        .current_period_end !==
        "string"
    ) ||
    typeof value
      .cancel_at_period_end !==
      "boolean" ||
    typeof value
      .founding_customer !==
      "boolean"
  ) {
    return null;
  }

  return {
    userId:
      value.user_id,

    plan_id:
      value.plan_id,

    billing_interval:
      value.billing_interval,

    status:
      value.status,

    locked_price_usd_cents:
      value
        .locked_price_usd_cents,

    current_period_end:
      value.current_period_end,

    cancel_at_period_end:
      value.cancel_at_period_end,

    founding_customer:
      value.founding_customer,
  };
}


export function selectEligibleProUserIds(
  rows:
    readonly unknown[],
  now:
    Date = new Date()
) {
  const grouped =
    new Map<
      string,
      SubscriptionEntitlementRow[]
    >();

  for (
    const raw of rows
  ) {
    const row =
      parseSubscription(raw);

    if (!row) {
      continue;
    }

    const existing =
      grouped.get(
        row.userId
      ) ?? [];

    existing.push({
      plan_id:
        row.plan_id,

      billing_interval:
        row.billing_interval,

      status:
        row.status,

      locked_price_usd_cents:
        row.locked_price_usd_cents,

      current_period_end:
        row.current_period_end,

      cancel_at_period_end:
        row.cancel_at_period_end,

      founding_customer:
        row.founding_customer,
    });

    grouped.set(
      row.userId,
      existing
    );
  }

  const eligible =
    new Set<string>();

  for (
    const [
      userId,
      subscriptions,
    ] of grouped
  ) {
    const entitlement =
      resolveAccountEntitlement(
        subscriptions,
        now
      );

    if (
      entitlement.planId ===
      "pro"
    ) {
      eligible.add(
        userId
      );
    }
  }

  return eligible;
}


export function parseEvaluationRule(
  value:
    unknown
): AlertEvaluationRule | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !==
      "string" ||
    typeof value.user_id !==
      "string" ||
    typeof value.network !==
      "string" ||
    typeof value.subject_type !==
      "string" ||
    typeof value.subject_value !==
      "string" ||
    value.rule_type !==
      "new_activity" ||
    typeof value.enabled !==
      "boolean"
  ) {
    return null;
  }

  const network =
    value.network.trim();

  const subjectType =
    value.subject_type.trim();

  const subjectValue =
    value.subject_value.trim();

  if (
    !network ||
    !subjectType ||
    !subjectValue
  ) {
    return null;
  }

  return {
    id:
      value.id,

    userId:
      value.user_id,

    network,

    subjectType,

    subjectValue,

    ruleType:
      "new_activity",

    enabled:
      value.enabled,
  };
}


export function planDirectActivityTarget(
  rule:
    AlertEvaluationRule
):
  | {
      status:
        "ready";

      target:
        AlertEvaluationTarget;
    }
  | {
      status:
        "skip";

      reason:
        | "rule_disabled"
        | "unsupported_network"
        | "unsupported_subject";
    } {
  if (!rule.enabled) {
    return {
      status:
        "skip",

      reason:
        "rule_disabled",
    };
  }

  const resolution =
    resolveIntelligenceNetwork(
      rule.network
    );

  if (!resolution.ok) {
    return {
      status:
        "skip",

      reason:
        "unsupported_network",
    };
  }

  if (
    resolution.engine ===
      "solana"
  ) {
    return {
      status:
        "skip",

      reason:
        "unsupported_network",
    };
  }

  if (
    resolution.engine ===
      "bitcoin" &&
    rule.subjectType !==
      "wallet"
  ) {
    return {
      status:
        "skip",

      reason:
        "unsupported_subject",
    };
  }

  if (
    resolution.engine ===
      "evm" &&
    rule.subjectType !==
      "wallet" &&
    rule.subjectType !==
      "token"
  ) {
    return {
      status:
        "skip",

      reason:
        "unsupported_subject",
    };
  }

  return {
    status:
      "ready",

    target: {
      network:
        rule.network,

      subjectType:
        rule.subjectType,

      subjectValue:
        rule.subjectValue,
    },
  };
}
