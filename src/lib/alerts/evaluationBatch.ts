import "server-only";

import {
  applyAlertObservation,
} from "@/lib/alerts/detectionStore";

import {
  MAX_ALERT_RULES_PER_RUN,
  parseEvaluationRule,
  planDirectActivityTarget,
  selectEligibleProUserIds,
} from "@/lib/alerts/evaluator";

import {
  observeMonitoringTarget,
} from "@/lib/alerts/monitoringObserver";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


export type AlertEvaluationBatchSummary = {
  eligibleProUsers:
    number;

  candidateRules:
    number;

  selectedRules:
    number;

  evaluatedRules:
    number;

  skippedRules:
    number;

  unavailableRules:
    number;

  providerCalls:
    number;

  eventsCreated:
    number;

  duplicateEvents:
    number;

  errors:
    number;
};


function emptySummary():
  AlertEvaluationBatchSummary {
  return {
    eligibleProUsers:
      0,

    candidateRules:
      0,

    selectedRules:
      0,

    evaluatedRules:
      0,

    skippedRules:
      0,

    unavailableRules:
      0,

    providerCalls:
      0,

    eventsCreated:
      0,

    duplicateEvents:
      0,

    errors:
      0,
  };
}


export async function runAlertEvaluationBatch({
  now =
    new Date(),
}: {
  now?:
    Date;
} = {}): Promise<
  AlertEvaluationBatchSummary
> {
  const admin =
    createAdminClient();

  const summary =
    emptySummary();


  // ----------------------------------------------
  // 1. ELIGIBLE PRO USERS FIRST
  // ----------------------------------------------

  const {
    data:
      subscriptions,
    error:
      subscriptionError,
  } =
    await admin
      .from(
        "subscriptions"
      )
      .select(`
        user_id,
        plan_id,
        billing_interval,
        status,
        locked_price_usd_cents,
        current_period_end,
        cancel_at_period_end,
        founding_customer
      `)
      .eq(
        "plan_id",
        "pro"
      )
      .in(
        "status",
        [
          "active",
          "canceling",
        ]
      );

  if (subscriptionError) {
    throw new Error(
      "Unable to load monitoring entitlements."
    );
  }

  const eligibleUsers =
    selectEligibleProUserIds(
      subscriptions ?? [],
      now
    );

  summary.eligibleProUsers =
    eligibleUsers.size;

  /*
   * Critical cost gate:
   *
   * no eligible Pro user means
   * zero blockchain/provider work.
   */
  if (
    eligibleUsers.size ===
    0
  ) {
    return summary;
  }


  // ----------------------------------------------
  // 2. DIRECT NEW_ACTIVITY RULES ONLY
  //
  // Watchlist rules deliberately remain excluded
  // until target-level state exists.
  // ----------------------------------------------

  const {
    data:
      rawRules,
    error:
      ruleError,
  } =
    await admin
      .from(
        "alert_rules"
      )
      .select(`
        id,
        user_id,
        network,
        subject_type,
        subject_value,
        rule_type,
        enabled
      `)
      .eq(
        "enabled",
        true
      )
      .eq(
        "rule_type",
        "new_activity"
      )
      .is(
        "watchlist_id",
        null
      )
      .in(
        "user_id",
        Array.from(
          eligibleUsers
        )
      )
      .limit(
        100
      );

  if (ruleError) {
    throw new Error(
      "Unable to load monitoring rules."
    );
  }

  const rules =
    (rawRules ?? [])
      .map(
        parseEvaluationRule
      )
      .filter(
        (
          rule
        ): rule is NonNullable<
          ReturnType<
            typeof parseEvaluationRule
          >
        > =>
          rule !== null
      );

  summary.candidateRules =
    rules.length;

  if (
    rules.length ===
    0
  ) {
    return summary;
  }


  // ----------------------------------------------
  // 3. FAIRNESS: NEVER-OBSERVED FIRST,
  // THEN OLDEST OBSERVATION
  // ----------------------------------------------

  const {
    data:
      states,
    error:
      stateError,
  } =
    await admin
      .from(
        "alert_detection_state"
      )
      .select(
        "alert_rule_id,observed_at"
      )
      .in(
        "alert_rule_id",
        rules.map(
          rule =>
            rule.id
        )
      );

  if (stateError) {
    throw new Error(
      "Unable to load monitoring freshness."
    );
  }

  const observed =
    new Map<
      string,
      number
    >();

  for (
    const state of
      states ?? []
  ) {
    if (
      typeof state
        .alert_rule_id ===
        "string" &&
      typeof state
        .observed_at ===
        "string"
    ) {
      const timestamp =
        Date.parse(
          state.observed_at
        );

      if (
        Number.isFinite(
          timestamp
        )
      ) {
        observed.set(
          state.alert_rule_id,
          timestamp
        );
      }
    }
  }

  rules.sort(
    (
      left,
      right
    ) =>
      (
        observed.get(
          left.id
        ) ??
        Number.NEGATIVE_INFINITY
      ) -
      (
        observed.get(
          right.id
        ) ??
        Number.NEGATIVE_INFINITY
      )
  );

  const selected =
    rules.slice(
      0,
      MAX_ALERT_RULES_PER_RUN
    );

  summary.selectedRules =
    selected.length;


  // ----------------------------------------------
  // 4. STRICT SEQUENTIAL EXECUTION
  // ----------------------------------------------

  for (
    const rule of selected
  ) {
    try {
      const plan =
        planDirectActivityTarget(
          rule
        );

      if (
        plan.status ===
        "skip"
      ) {
        summary.skippedRules +=
          1;

        continue;
      }

      const observation =
        await observeMonitoringTarget({
          target:
            plan.target,
        });

      if (
        observation.providerCalled
      ) {
        summary.providerCalls +=
          1;
      }

      if (
        observation.status !==
        "observed"
      ) {
        summary.unavailableRules +=
          1;

        continue;
      }

      const persisted =
        await applyAlertObservation({
          ruleId:
            rule.id,

          observation:
            observation.observation,
        });

      if (
        persisted.outcome ===
          "rule_not_found" ||
        persisted.outcome ===
          "rule_disabled"
      ) {
        summary.skippedRules +=
          1;

        continue;
      }

      summary.evaluatedRules +=
        1;

      if (
        persisted.eventCreated
      ) {
        summary.eventsCreated +=
          1;
      }

      if (
        persisted.duplicateEvent
      ) {
        summary.duplicateEvents +=
          1;
      }

    } catch {
      summary.errors +=
        1;
    }
  }

  return summary;
}
