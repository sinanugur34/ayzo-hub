import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  ProductEventName,
  ProductEventProperties,
} from "@/lib/productAnalyticsCore";

export async function recordProductEvent({
  userId,
  sessionId,
  eventName,
  properties,
}: {
  userId:
    string |
    null;

  sessionId:
    string;

  eventName:
    ProductEventName;

  properties:
    ProductEventProperties;
}) {
  try {
    const admin =
      createAdminClient();

    const {
      error,
    } =
      await admin
        .from(
          "product_events"
        )
        .insert({
          user_id:
            userId,

          session_id:
            sessionId,

          event_name:
            eventName,

          properties,
        });

    if (error) {
      console.error(
        "AYZO product analytics insert failed.",
        error.message
      );

      return false;
    }

    return true;
  } catch (error) {
    /*
     * Product analytics must never
     * interrupt AYZO.
     */
    console.error(
      "AYZO product analytics unavailable.",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return false;
  }
}
