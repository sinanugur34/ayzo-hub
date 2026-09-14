import {
  createCreemWebhookAdminClient,
} from "@/lib/billing/creemWebhookAdmin";

import {
  parseCreemWebhookPayload,
} from "@/lib/billing/creemWebhookPayload";

import {
  hashCreemWebhook,
  verifyCreemSignature,
} from "@/lib/billing/creemWebhookSecurity";

import {
  processCreemSubscriptionEvent,
} from "@/lib/billing/creemSubscriptionProcessor";

import {
  creemWebhookStaleCutoffIso,
  shouldTreatCreemWebhookAsDuplicate,
} from "@/lib/billing/creemWebhookRetryPolicyCore";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function requiredSecret() {
  const secret =
    process.env
      .CREEM_WEBHOOK_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      "CREEM_WEBHOOK_SECRET is not configured."
    );
  }

  return secret;
}

export async function POST(
  request: Request
) {
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "creem-signature"
    );

  if (!signature) {
    return Response.json(
      {
        ok: false,
        error:
          "Missing webhook signature.",
      },
      {
        status: 401,
      }
    );
  }

  let secret:
    string;

  try {
    secret =
      requiredSecret();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Webhook configuration unavailable.",
      },
      {
        status: 503,
      }
    );
  }

  if (
    !verifyCreemSignature({
      rawBody,
      signature,
      secret,
    })
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid webhook signature.",
      },
      {
        status: 401,
      }
    );
  }

  const parsed =
    parseCreemWebhookPayload(
      rawBody
    );

  if (!parsed.ok) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid webhook payload.",
      },
      {
        status: 400,
      }
    );
  }

  let admin;

  try {
    admin =
      createCreemWebhookAdminClient();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Webhook storage unavailable.",
      },
      {
        status: 503,
      }
    );
  }

  const event =
    parsed.event;

  const payloadHash =
    hashCreemWebhook(
      rawBody
    );

  const {
    error:
      insertError,
  } =
    await admin
      .from(
        "webhook_events"
      )
      .insert({
        provider:
          "creem",

        provider_event_id:
          event.id,

        event_type:
          event.eventType,

        processing_status:
          "received",

        payload_hash:
          payloadHash,
      });

  if (
    insertError &&
    insertError.code !==
      "23505"
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Webhook processing unavailable.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    insertError?.code ===
      "23505"
  ) {
    const {
      data:
        existing,
      error:
        existingError,
    } =
      await admin
        .from(
          "webhook_events"
        )
        .select(
          "processing_status,payload_hash,processing_started_at"
        )
        .eq(
          "provider",
          "creem"
        )
        .eq(
          "provider_event_id",
          event.id
        )
        .maybeSingle();

    if (
      existingError ||
      !existing
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Webhook retry state unavailable.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existing
        .payload_hash !==
      payloadHash
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Webhook event integrity conflict.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      shouldTreatCreemWebhookAsDuplicate({
        status:
          existing.processing_status,

        processingStartedAt:
          existing.processing_started_at,

        nowMs:
          Date.now(),
      })
    ) {
      return Response.json({
        ok: true,
        duplicate:
          true,
      });
    }
  }

  const claimStartedAt =
    new Date()
      .toISOString();

  const staleCutoff =
    creemWebhookStaleCutoffIso(
      Date.now()
    );

  let claimQuery =
    admin
      .from(
        "webhook_events"
      )
      .update({
        processing_status:
          "processing",

        processing_started_at:
          claimStartedAt,

        processed_at:
          null,
      })
      .eq(
        "provider",
        "creem"
      )
      .eq(
        "provider_event_id",
        event.id
      );

  if (
    insertError?.code ===
      "23505"
  ) {
    claimQuery =
      claimQuery.or(
        [
          "processing_status.eq.received",
          "processing_status.eq.failed",
          `and(processing_status.eq.processing,processing_started_at.lte.${staleCutoff})`,
          "and(processing_status.eq.processing,processing_started_at.is.null)",
        ].join(",")
      );
  } else {
    claimQuery =
      claimQuery.eq(
        "processing_status",
        "received"
      );
  }

  const {
    data:
      claimed,
    error:
      claimError,
  } =
    await claimQuery
      .select("id")
      .maybeSingle();

  if (claimError) {
    return Response.json(
      {
        ok: false,
        error:
          "Webhook claim unavailable.",
      },
      {
        status: 500,
      }
    );
  }

  if (!claimed) {
    return Response.json({
      ok: true,
      duplicate:
        true,
    });
  }

  try {
    const result =
      await processCreemSubscriptionEvent(
        event
      );

    const {
      data:
        finalized,
      error:
        finalizeError,
    } =
      await admin
        .from(
          "webhook_events"
        )
        .update({
          processing_status:
            result.status,

          processing_started_at:
            null,

          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "provider",
          "creem"
        )
        .eq(
          "provider_event_id",
          event.id
        )
        .eq(
          "processing_status",
          "processing"
        )
        .eq(
          "processing_started_at",
          claimStartedAt
        )
        .select("id")
        .maybeSingle();

    if (
      finalizeError ||
      !finalized
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Webhook finalization unavailable.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      ok: true,
      status:
        result.status,
    });
  } catch (error) {
    console.error(
      "Creem subscription processing failed",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    const {
      data:
        failedLedger,
      error:
        failedLedgerError,
    } =
      await admin
        .from(
          "webhook_events"
        )
        .update({
          processing_status:
            "failed",

          processing_started_at:
            null,

          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "provider",
          "creem"
        )
        .eq(
          "provider_event_id",
          event.id
        )
        .eq(
          "processing_status",
          "processing"
        )
        .eq(
          "processing_started_at",
          claimStartedAt
        )
        .select("id")
        .maybeSingle();

    if (
      failedLedgerError ||
      !failedLedger
    ) {
      console.error(
        "Creem webhook failure ledger update failed"
      );
    }

    /*
     * Non-2xx intentionally asks Creem
     * to retry transient failures.
     */
    return Response.json(
      {
        ok: false,
        error:
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
