import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  type SignupChannel,
  detectSignupSourceFromUserAgent,
  normalizeSignupCountryCode,
} from "@/lib/account/signupSource";

export async function recordSignupSource({
  userId,
  channel,
  userAgent,
  countryCode,
}: {
  userId: string;
  channel:
    SignupChannel;
  userAgent:
    string |
    null |
    undefined;
  countryCode:
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

          country_code:
            normalizeSignupCountryCode(
              countryCode
            ),

          source_version:
            1,
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
