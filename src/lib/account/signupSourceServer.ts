import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  type SignupChannel,
  detectSignupSourceFromUserAgent,
} from "@/lib/account/signupSource";

export async function recordSignupSource({
  userId,
  channel,
  userAgent,
}: {
  userId: string;
  channel:
    SignupChannel;
  userAgent:
    string |
    null |
    undefined;
}) {
  const source =
    detectSignupSourceFromUserAgent(
      userAgent,
      channel
    );

  const admin =
    createAdminClient();

  const {
    error,
  } =
    await admin
      .from(
        "user_signup_source"
      )
      .upsert(
        {
          user_id:
            userId,

          signup_channel:
            source.channel,

          device_class:
            source.deviceClass,

          os_family:
            source.osFamily,
        },
        {
          onConflict:
            "user_id",

          ignoreDuplicates:
            true,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }
}
