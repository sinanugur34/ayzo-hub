import "server-only";

import {
  buildWelcomeEmailMessage,
} from "@/lib/account/welcomeEmailMessage";

import {
  isWelcomeEmailProviderReady,
  sendWelcomeEmail,
} from "@/lib/account/welcomeEmailProvider";

import {
  claimWelcomeEmail,
  markWelcomeEmailDelivered,
  markWelcomeEmailFailed,
  resolveWelcomeEmailRecipient,
} from "@/lib/account/welcomeEmailStore";

export async function deliverWelcomeEmailIfEligible(
  userId:
    string
) {
  if (
    !isWelcomeEmailProviderReady()
  ) {
    return {
      status:
        "provider_unavailable" as const,
    };
  }

  const claim =
    await claimWelcomeEmail(
      userId
    );

  if (!claim) {
    return {
      status:
        "not_eligible" as const,
    };
  }

  try {
    const to =
      await resolveWelcomeEmailRecipient(
        userId
      );

    const message =
      buildWelcomeEmailMessage();

    const result =
      await sendWelcomeEmail({
        to,

        subject:
          message.subject,

        text:
          message.text,

        html:
          message.html,

        idempotencyKey:
          `ayzo-welcome:${claim.id}`,
      });

    if (
      result.status ===
        "delivered"
    ) {
      await markWelcomeEmailDelivered(
        claim,
        result.providerMessageId
      );

      return {
        status:
          "delivered" as const,
      };
    }

    await markWelcomeEmailFailed(
      claim,
      result.errorCode,
      result.status ===
        "retryable_failure"
    );

    return {
      status:
        result.status,
    };
  } catch {
    await markWelcomeEmailFailed(
      claim,
      "WELCOME_DELIVERY_INTERNAL_ERROR",
      true
    );

    return {
      status:
        "retryable_failure" as const,
    };
  }
}
