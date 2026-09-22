import "server-only";

import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

const GOOGLE_JWKS =
  createRemoteJWKSet(
    new URL(
      "https://www.googleapis.com/oauth2/v3/certs"
    )
  );

const RTDN_AUDIENCE =
  "https://app.ayzo.io/api/billing/webhooks/google-play/rtdn";

const RTDN_PUSH_SERVICE_ACCOUNT =
  "ayzo-google-play-rtdn-push@project-743c1d83-fb1f-498b-bdf.iam.gserviceaccount.com";

export async function verifyGooglePlayRtdnAuthorization(
  authorization: string | null
) {
  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return false;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (
    token.length < 20 ||
    token.length > 16_384
  ) {
    return false;
  }

  try {
    const {
      payload,
    } =
      await jwtVerify(
        token,
        GOOGLE_JWKS,
        {
          audience:
            RTDN_AUDIENCE,

          issuer: [
            "https://accounts.google.com",
            "accounts.google.com",
          ],
        }
      );

    return (
      payload.email ===
        RTDN_PUSH_SERVICE_ACCOUNT &&
      payload.email_verified ===
        true
    );
  } catch {
    return false;
  }
}
