import {
  createHash,
} from "node:crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  parseGooglePlayRtdnEnvelope,
} from "@/lib/billing/googlePlayRtdnCore";

import {
  processGooglePlayRtdnSubscription,
} from "@/lib/billing/googlePlayRtdnProcessor";

import {
  googlePlayRtdnStaleCutoffIso,
  shouldTreatGooglePlayRtdnAsDuplicate,
} from "@/lib/billing/googlePlayRtdnRetryPolicyCore";

import {
  verifyGooglePlayRtdnAuthorization,
} from "@/lib/billing/googlePlayRtdnSecurity";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function hashPayload(
  rawBody: string
) {
  return createHash(
    "sha256"
  )
    .update(
      rawBody
    )
    .digest(
      "hex"
    );
}

function eventType(
  event:
    | {
        kind:
          "subscription";
        notificationType:
          number;
      }
    | {
        kind:
          "test" | "ignored";
      }
) {
  if (
    event.kind ===
      "subscription"
  ) {
    return `subscription:${event.notificationType}`;
  }

  return event.kind;
}

export async function POST(
  request: Request
) {
  const authorized =
    await verifyGooglePlayRtdnAuthorization(
      request.headers.get(
        "authorization"
      )
    );

  if (!authorized) {
    return Response.json(
      {
        ok: false,
        error:
          "Unauthorized Pub/Sub push.",
      },
      {
        status: 401,
      }
    );
  }

  const rawBody =
    await request.text();

  let body:
    unknown;

  try {
    body =
      JSON.parse(
        rawBody
      );
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid Pub/Sub payload.",
      },
      {
        status: 400,
      }
    );
  }

  const parsed =
    parseGooglePlayRtdnEnvelope(
      body
    );

  if (!parsed.ok) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid Google Play RTDN payload.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const event =
    parsed.event;

  const payloadHash =
    hashPayload(
      rawBody
    );

  const providerEventId =
    event.messageId;

  const providerEventType =
    eventType(
      event
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
          "google_play_rtdn",

        provider_event_id:
          providerEventId,

        event_type:
          providerEventType,

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
          "RTDN ledger unavailable.",
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
          "google_play_rtdn"
        )
        .eq(
          "provider_event_id",
          providerEventId
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
            "RTDN retry state unavailable.",
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
            "RTDN message integrity conflict.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      shouldTreatGooglePlayRtdnAsDuplicate({
        status:
          existing
            .processing_status,

        processingStartedAt:
          existing
            .processing_started_at,

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
    googlePlayRtdnStaleCutoffIso(
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
        "google_play_rtdn"
      )
      .eq(
        "provider_event_id",
        providerEventId
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
      .select(
        "id"
      )
      .maybeSingle();

  if (
    claimError
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "RTDN claim unavailable.",
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
    let finalStatus:
      "processed" |
      "ignored";

    if (
      event.kind ===
        "subscription"
    ) {
      await processGooglePlayRtdnSubscription(
        event.purchaseToken
      );

      finalStatus =
        "processed";
    } else if (
      event.kind ===
        "test"
    ) {
      finalStatus =
        "processed";
    } else {
      finalStatus =
        "ignored";
    }

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
            finalStatus,

          processing_started_at:
            null,

          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "provider",
          "google_play_rtdn"
        )
        .eq(
          "provider_event_id",
          providerEventId
        )
        .eq(
          "processing_status",
          "processing"
        )
        .eq(
          "processing_started_at",
          claimStartedAt
        )
        .select(
          "id"
        )
        .maybeSingle();

    if (
      finalizeError ||
      !finalized
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "RTDN finalization unavailable.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      ok: true,
      status:
        finalStatus,
    });
  } catch (error) {
    console.error(
      "Google Play RTDN processing failed",
      error instanceof Error
        ? error.message
        : "unknown"
    );

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
        "google_play_rtdn"
      )
      .eq(
        "provider_event_id",
        providerEventId
      )
      .eq(
        "processing_status",
        "processing"
      )
      .eq(
        "processing_started_at",
        claimStartedAt
      );

    return Response.json(
      {
        ok: false,
        error:
          "Google Play RTDN processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
