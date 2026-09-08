import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type WelcomeEmailClaim = {
  id: string;
  userId: string;
  attemptCount:
    number;
  claimToken:
    string;
};

export async function claimWelcomeEmail(
  userId:
    string
):
  Promise<
    WelcomeEmailClaim |
    null
  > {
  const admin =
    createAdminClient();

  const claimToken =
    randomUUID();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_claim_welcome_email",
      {
        p_user_id:
          userId,

        p_claim_token:
          claimToken,
      }
    );

  if (error) {
    throw new Error(
      "Unable to claim welcome email."
    );
  }

  if (
    !Array.isArray(data) ||
    data.length ===
      0
  ) {
    return null;
  }

  if (
    data.length !==
      1
  ) {
    throw new Error(
      "Invalid welcome email claim result."
    );
  }

  const row =
    data[0] as Record<
      string,
      unknown
    >;

  if (
    typeof row.id !==
      "string" ||
    typeof row.user_id !==
      "string" ||
    typeof row.attempt_count !==
      "number"
  ) {
    throw new Error(
      "Invalid welcome email claim."
    );
  }

  return {
    id:
      row.id,

    userId:
      row.user_id,

    attemptCount:
      row.attempt_count,

    claimToken,
  };
}

export async function resolveWelcomeEmailRecipient(
  userId:
    string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.auth.admin
      .getUserById(
        userId
      );

  if (
    error ||
    !data.user
  ) {
    throw new Error(
      "Unable to resolve welcome email recipient."
    );
  }

  const email =
    data.user.email
      ?.trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      "Welcome email recipient has no email."
    );
  }

  return email;
}

export async function markWelcomeEmailDelivered(
  claim:
    WelcomeEmailClaim,
  providerMessageId:
    string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "welcome_email_deliveries"
      )
      .update({
        status:
          "delivered",

        retryable:
          false,

        claim_token:
          null,

        claimed_at:
          null,

        last_error_code:
          null,

        provider_message_id:
          providerMessageId,

        delivered_at:
          new Date()
            .toISOString(),

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        claim.id
      )
      .eq(
        "user_id",
        claim.userId
      )
      .eq(
        "status",
        "processing"
      )
      .eq(
        "claim_token",
        claim.claimToken
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Unable to finalize welcome email."
    );
  }
}

export async function markWelcomeEmailFailed(
  claim:
    WelcomeEmailClaim,
  errorCode:
    string,
  retryable:
    boolean
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "welcome_email_deliveries"
      )
      .update({
        status:
          "failed",

        retryable,

        claim_token:
          null,

        claimed_at:
          null,

        last_error_code:
          errorCode,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        claim.id
      )
      .eq(
        "user_id",
        claim.userId
      )
      .eq(
        "status",
        "processing"
      )
      .eq(
        "claim_token",
        claim.claimToken
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Unable to record welcome email failure."
    );
  }
}
