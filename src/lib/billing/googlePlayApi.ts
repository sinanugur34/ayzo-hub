import "server-only";

import {
  getVercelOidcToken,
} from "@vercel/oidc";

const STS_TOKEN_URL =
  "https://sts.googleapis.com/v1/token";

const IAM_CREDENTIALS_URL =
  "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
  "ayzo-google-play-billing%40project-743c1d83-fb1f-498b-bdf.iam.gserviceaccount.com" +
  ":generateAccessToken";

const WIF_AUDIENCE =
  "//iam.googleapis.com/projects/674643951828/locations/global/" +
  "workloadIdentityPools/ayzo-vercel/providers/vercel";

const CLOUD_PLATFORM_SCOPE =
  "https://www.googleapis.com/auth/cloud-platform";

const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";

const PACKAGE_NAME =
  "io.ayzo.app";

let cachedAccessToken:
  | {
      token: string;
      expiresAtMs: number;
    }
  | null =
    null;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function getFederatedAccessToken() {
  const oidcToken =
    await getVercelOidcToken();

  if (
    typeof oidcToken !== "string" ||
    oidcToken.length < 20
  ) {
    throw new Error(
      "VERCEL_OIDC_TOKEN_UNAVAILABLE"
    );
  }

  const response =
    await fetch(
      STS_TOKEN_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            audience:
              WIF_AUDIENCE,

            grantType:
              "urn:ietf:params:oauth:grant-type:token-exchange",

            requestedTokenType:
              "urn:ietf:params:oauth:token-type:access_token",

            scope:
              CLOUD_PLATFORM_SCOPE,

            subjectTokenType:
              "urn:ietf:params:oauth:token-type:id_token",

            subjectToken:
              oidcToken,
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_STS_FAILED_${response.status}`
    );
  }

  const payload:
    unknown =
      await response.json();

  if (
    !isRecord(payload) ||
    typeof payload.access_token !==
      "string"
  ) {
    throw new Error(
      "GOOGLE_PLAY_STS_INVALID_RESPONSE"
    );
  }

  return payload.access_token;
}

async function accessToken() {
  const now =
    Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAtMs >
      now + 60_000
  ) {
    return cachedAccessToken.token;
  }

  const federatedToken =
    await getFederatedAccessToken();

  const response =
    await fetch(
      IAM_CREDENTIALS_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${federatedToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            scope: [
              ANDROID_PUBLISHER_SCOPE,
            ],

            lifetime:
              "3600s",
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_IMPERSONATION_FAILED_${response.status}`
    );
  }

  const payload:
    unknown =
      await response.json();

  if (
    !isRecord(payload) ||
    typeof payload.accessToken !==
      "string" ||
    typeof payload.expireTime !==
      "string"
  ) {
    throw new Error(
      "GOOGLE_PLAY_IMPERSONATION_INVALID_RESPONSE"
    );
  }

  const expiresAtMs =
    Date.parse(
      payload.expireTime
    );

  if (
    !Number.isFinite(
      expiresAtMs
    )
  ) {
    throw new Error(
      "GOOGLE_PLAY_IMPERSONATION_INVALID_EXPIRY"
    );
  }

  cachedAccessToken = {
    token:
      payload.accessToken,

    expiresAtMs,
  };

  return payload.accessToken;
}

export async function getGooglePlaySubscription(
  purchaseToken: string
): Promise<unknown> {
  const token =
    await accessToken();

  const response =
    await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
        purchaseToken
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_VERIFY_FAILED_${response.status}`
    );
  }

  return response.json();
}

export async function acknowledgeGooglePlaySubscription({
  productId,
  purchaseToken,
}: {
  productId: string;
  purchaseToken: string;
}) {
  const token =
    await accessToken();

  const response =
    await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(
        productId
      )}/tokens/${encodeURIComponent(
        purchaseToken
      )}:acknowledge`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          "{}",
      }
    );

  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_ACK_FAILED_${response.status}`
    );
  }
}


export async function checkGooglePlayPublisherAccess() {
  const token =
    await accessToken();

  const probeToken =
    "AYZO_WIF_HEALTH_PROBE_INVALID_TOKEN";

  const response =
    await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${probeToken}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        cache:
          "no-store",
      }
    );

  /*
   * A deliberately invalid purchase token should not succeed.
   * 400/404 proves that Google accepted our authentication and
   * reached the Purchases API. 401/403 means auth/authorization
   * is still broken.
   */
  if (
    response.status === 400 ||
    response.status === 404
  ) {
    return {
      ok: true as const,
      publisherApiReachable: true as const,
    };
  }

  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_PUBLISHER_HEALTH_FAILED_${response.status}`
    );
  }

  return {
    ok: true as const,
    publisherApiReachable: true as const,
  };
}
