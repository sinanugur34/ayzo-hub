import {
  createFastSpringWebhookAdminClient,
} from "@/lib/billing/fastspringWebhookAdmin";

import {
  parseFastSpringWebhookPayload,
} from "@/lib/billing/fastspringWebhookPayload";

import {
  hashFastSpringEvent,
  verifyFastSpringSignature,
} from "@/lib/billing/fastspringWebhookSecurity";

import {
  processFastSpringSubscriptionEvent,
} from "@/lib/billing/fastspringSubscriptionProcessor";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function requiredSecret() {
  const secret =
    process.env
      .FASTSPRING_WEBHOOK_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      "FastSpring webhook secret is not configured."
    );
  }

  return secret;
}

export async function POST(
  request:
    Request
) {
  /*
   * Signature validation MUST
   * use the untouched raw body.
   * Do not call request.json()
   * before this point.
   */
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "x-fs-signature"
    );

  if (!signature) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Missing webhook signature.",
      },
      {
        status:
          401,
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
        ok:
          false,
        error:
          "Webhook configuration unavailable.",
      },
      {
        status:
          503,
      }
    );
  }

  if (
    !verifyFastSpringSignature({
      rawBody,
      signature,
      secret,
    })
  ) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Invalid webhook signature.",
      },
      {
        status:
          401,
      }
    );
  }

  const parsed =
    parseFastSpringWebhookPayload(
      rawBody
    );

  if (!parsed.ok) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Invalid webhook payload.",
      },
      {
        status:
          400,
      }
    );
  }

  /*
   * AYZO billing integration is
   * test-only until deliberate
   * production activation.
   */
  if (
    process.env
      .FASTSPRING_MODE !==
      "test"
  ) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Webhook mode is not enabled.",
      },
      {
        status:
          503,
      }
    );
  }

  if (
    parsed.payload.events.some(
      event =>
        event.live
    )
  ) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Live FastSpring events are not accepted in test mode.",
      },
      {
        status:
          409,
      }
    );
  }

  let admin;

  try {
    admin =
      createFastSpringWebhookAdminClient();
  } catch {
    return Response.json(
      {
        ok:
          false,
        error:
          "Webhook storage unavailable.",
      },
      {
        status:
          503,
      }
    );
  }

  let received =
    0;

  let duplicates =
    0;

  let processed =
    0;

  let ignored =
    0;

  for (
    const event of
    parsed.payload.events
  ) {
    const payloadHash =
      hashFastSpringEvent(
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
            "fastspring",

          provider_event_id:
            event.id,

          event_type:
            event.type,

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
      console.error(
        "FastSpring webhook ledger write failed",
        {
          code:
            insertError.code ??
            null,
        }
      );

      return Response.json(
        {
          ok:
            false,
          error:
            "Webhook processing unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      insertError?.code ===
      "23505"
    ) {
      const {
        data:
          existingEvent,
        error:
          existingError,
      } =
        await admin
          .from(
            "webhook_events"
          )
          .select(
            "processing_status,payload_hash"
          )
          .eq(
            "provider",
            "fastspring"
          )
          .eq(
            "provider_event_id",
            event.id
          )
          .maybeSingle();

      if (
        existingError ||
        !existingEvent
      ) {
        return Response.json(
          {
            ok:
              false,
            error:
              "Webhook retry state unavailable.",
          },
          {
            status:
              500,
          }
        );
      }

      /*
       * Same provider event ID with
       * a different body is not a
       * valid retry.
       */
      if (
        existingEvent
          .payload_hash !==
        payloadHash
      ) {
        return Response.json(
          {
            ok:
              false,
            error:
              "Webhook event integrity conflict.",
          },
          {
            status:
              409,
          }
        );
      }

      if (
        existingEvent
          .processing_status ===
          "processed" ||
        existingEvent
          .processing_status ===
          "ignored"
      ) {
        duplicates +=
          1;

        continue;
      }
    } else {
      received +=
        1;
    }

    const {
      error:
        processingError,
    } =
      await admin
        .from(
          "webhook_events"
        )
        .update({
          processing_status:
            "processing",
        })
        .eq(
          "provider",
          "fastspring"
        )
        .eq(
          "provider_event_id",
          event.id
        );

    if (
      processingError
    ) {
      return Response.json(
        {
          ok:
            false,
          error:
            "Webhook processing state unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    try {
      const result =
        await processFastSpringSubscriptionEvent(
          admin,
          event
        );

      const finalStatus =
        result.outcome ===
        "processed"
          ? "processed"
          : "ignored";

      const {
        error:
          finalError,
      } =
        await admin
          .from(
            "webhook_events"
          )
          .update({
            processing_status:
              finalStatus,

            processed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "provider",
            "fastspring"
          )
          .eq(
            "provider_event_id",
            event.id
          );

      if (
        finalError
      ) {
        throw new Error(
          "Webhook ledger finalization failed."
        );
      }

      if (
        result.outcome ===
        "processed"
      ) {
        processed +=
          1;
      } else {
        ignored +=
          1;
      }
    } catch (error) {
      await admin
        .from(
          "webhook_events"
        )
        .update({
          processing_status:
            "failed",
        })
        .eq(
          "provider",
          "fastspring"
        )
        .eq(
          "provider_event_id",
          event.id
        );

      console.error(
        "FastSpring subscription processing failed",
        error instanceof
          Error
          ? error.message
          : "unknown"
      );

      return Response.json(
        {
          ok:
            false,
          error:
            "Webhook subscription processing failed.",
        },
        {
          status:
            500,
        }
      );
    }
  }

  return Response.json(
    {
      ok:
        true,

      received,

      duplicates,

      processed,

      ignored,

      subscriptionStateChanged:
        processed > 0,
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
