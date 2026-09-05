import "server-only";

import type {
  AlertDeliveryRow,
} from "@/lib/alerts/deliveryStore";

import {
  resolveAlertDeliveryEmail,
} from "@/lib/alerts/deliveryStore";

import type {
  AlertDeliveryContext,
  AlertDeliveryEventContext,
} from "@/lib/alerts/deliveryWorker";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

function isEventType(
  value: unknown
): value is
  AlertDeliveryEventContext[
    "eventType"
  ] {
  return (
    value ===
      "new_activity" ||
    value ===
      "funding_movement" ||
    value ===
      "relationship_change" ||
    value ===
      "contract_activity"
  );
}

export async function loadAlertDeliveryContext(
  row:
    AlertDeliveryRow
):
  Promise<AlertDeliveryContext> {
  const admin =
    createAdminClient();

  const [
    eventResult,
    ruleResult,
    recipientEmail,
  ] =
    await Promise.all([
      admin
        .from(
          "alert_events"
        )
        .select(
          "id,alert_rule_id,user_id,event_type,evidence_state,evidence_refs,event_payload,detected_at"
        )
        .eq(
          "id",
          row.alert_event_id
        )
        .eq(
          "alert_rule_id",
          row.alert_rule_id
        )
        .eq(
          "user_id",
          row.user_id
        )
        .maybeSingle(),

      admin
        .from(
          "alert_rules"
        )
        .select(
          "id,user_id,network,subject_type,subject_value,rule_type,delivery_channel,enabled"
        )
        .eq(
          "id",
          row.alert_rule_id
        )
        .eq(
          "user_id",
          row.user_id
        )
        .maybeSingle(),

      resolveAlertDeliveryEmail(
        row.user_id
      ),
    ]);

  if (
    eventResult.error ||
    !eventResult.data
  ) {
    throw new Error(
      "Alert delivery event context unavailable."
    );
  }

  if (
    ruleResult.error ||
    !ruleResult.data
  ) {
    throw new Error(
      "Alert delivery rule context unavailable."
    );
  }

  const event =
    eventResult.data;

  const rule =
    ruleResult.data;

  if (
    !isEventType(
      event.event_type
    ) ||
    event.evidence_state !==
      "SUPPORTED" ||
    !Array.isArray(
      event.evidence_refs
    ) ||
    typeof event.event_payload !==
      "object" ||
    event.event_payload ===
      null ||
    Array.isArray(
      event.event_payload
    ) ||
    typeof event.detected_at !==
      "string"
  ) {
    throw new Error(
      "Invalid alert delivery event context."
    );
  }

  if (
    typeof rule.rule_type !==
      "string" ||
    (
      rule.delivery_channel !==
        "email" &&
      rule.delivery_channel !==
        "browser" &&
      rule.delivery_channel !==
        "telegram"
    ) ||
    typeof rule.enabled !==
      "boolean"
  ) {
    throw new Error(
      "Invalid alert delivery rule context."
    );
  }

  return {
    delivery:
      row,

    event: {
      eventType:
        event.event_type,

      evidenceState:
        "SUPPORTED",

      evidenceRefs:
        event.evidence_refs,

      eventPayload:
        event.event_payload as
          Record<
            string,
            unknown
          >,

      detectedAt:
        event.detected_at,
    },

    rule: {
      network:
        typeof rule.network ===
          "string"
          ? rule.network
          : null,

      subjectType:
        typeof rule.subject_type ===
          "string"
          ? rule.subject_type
          : null,

      subjectValue:
        typeof rule.subject_value ===
          "string"
          ? rule.subject_value
          : null,

      ruleType:
        rule.rule_type,

      deliveryChannel:
        rule.delivery_channel,

      enabled:
        rule.enabled,
    },

    recipientEmail,
  };
}
