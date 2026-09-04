import {
  basicAlertRuleTypes,
  type BasicAlertRuleType,
} from "@/lib/account/alertRules";

import {
  evaluateAlertObservation,
  hashAlertDetectionSnapshot,
  parseAlertDetectionSnapshot,
  type AlertObservation,
} from "@/lib/alerts/detection";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

function isBasicAlertRuleType(
  value:
    unknown
): value is BasicAlertRuleType {
  return (
    typeof value ===
      "string" &&
    basicAlertRuleTypes.includes(
      value as
        BasicAlertRuleType
    )
  );
}

export type ApplyAlertObservationResult = {
  outcome:
    | "rule_not_found"
    | "rule_disabled"
    | "baseline"
    | "no_change"
    | "changed";

  eventCreated:
    boolean;

  duplicateEvent:
    boolean;

  stateHash:
    string | null;
};

export async function applyAlertObservation({
  ruleId,
  observation,
}: {
  ruleId:
    string;

  observation:
    AlertObservation;
}): Promise<
  ApplyAlertObservationResult
> {
  const admin =
    createAdminClient();

  const {
    data:
      rule,
    error:
      ruleError,
  } =
    await admin
      .from(
        "alert_rules"
      )
      .select(
        "id,user_id,rule_type,enabled"
      )
      .eq(
        "id",
        ruleId
      )
      .maybeSingle();

  if (ruleError) {
    throw new Error(
      "Unable to load alert rule for detection."
    );
  }

  if (!rule) {
    return {
      outcome:
        "rule_not_found",

      eventCreated:
        false,

      duplicateEvent:
        false,

      stateHash:
        null,
    };
  }

  if (!rule.enabled) {
    return {
      outcome:
        "rule_disabled",

      eventCreated:
        false,

      duplicateEvent:
        false,

      stateHash:
        null,
    };
  }

  if (
    !isBasicAlertRuleType(
      rule.rule_type
    )
  ) {
    throw new Error(
      "Unsupported alert rule type for detection."
    );
  }

  const {
    data:
      existingState,
    error:
      stateReadError,
  } =
    await admin
      .from(
        "alert_detection_state"
      )
      .select(
        "state_hash,snapshot"
      )
      .eq(
        "alert_rule_id",
        rule.id
      )
      .maybeSingle();

  if (stateReadError) {
    throw new Error(
      "Unable to load alert detection state."
    );
  }

  let previousSnapshot =
    null;

  if (existingState) {
    previousSnapshot =
      parseAlertDetectionSnapshot(
        existingState.snapshot
      );

    if (!previousSnapshot) {
      throw new Error(
        "Alert detection state snapshot is invalid."
      );
    }

    const expectedHash =
      hashAlertDetectionSnapshot(
        previousSnapshot
      );

    if (
      expectedHash !==
      existingState.state_hash
    ) {
      throw new Error(
        "Alert detection state integrity check failed."
      );
    }
  }

  const result =
    evaluateAlertObservation({
      ruleType:
        rule.rule_type,

      previousSnapshot,

      observation,
    });

  let eventCreated =
    false;

  let duplicateEvent =
    false;

  /*
   * IMPORTANT ORDER:
   *
   * Persist a new event BEFORE advancing
   * detector state.
   *
   * If event persistence fails, state
   * remains old and the evaluator can
   * safely retry.
   *
   * Duplicate event_key is safe and
   * intentionally treated as idempotent.
   */
  if (result.event) {
    const {
      error:
        eventError,
    } =
      await admin
        .from(
          "alert_events"
        )
        .insert({
          alert_rule_id:
            rule.id,

          user_id:
            rule.user_id,

          event_key:
            result.event
              .eventKey,

          event_type:
            result.event
              .eventType,

          previous_state_hash:
            result.event
              .previousStateHash,

          current_state_hash:
            result.event
              .currentStateHash,

          evidence_state:
            "SUPPORTED",

          evidence_refs:
            result.event
              .evidenceRefs,

          event_payload:
            result.event
              .payload,

          detected_at:
            observation
              .observedAt,
        });

    if (eventError) {
      if (
        eventError.code ===
          "23505"
      ) {
        duplicateEvent =
          true;
      } else {
        throw new Error(
          "Unable to persist alert event."
        );
      }
    } else {
      eventCreated =
        true;
    }
  }

  const {
    error:
      stateWriteError,
  } =
    await admin
      .from(
        "alert_detection_state"
      )
      .upsert(
        {
          alert_rule_id:
            rule.id,

          user_id:
            rule.user_id,

          state_version:
            1,

          state_hash:
            result.stateHash,

          snapshot:
            result.snapshot,

          observed_at:
            observation
              .observedAt,
        },
        {
          onConflict:
            "alert_rule_id",
        }
      );

  if (stateWriteError) {
    throw new Error(
      "Unable to persist alert detection state."
    );
  }

  return {
    outcome:
      result.outcome,

    eventCreated,

    duplicateEvent,

    stateHash:
      result.stateHash,
  };
}
