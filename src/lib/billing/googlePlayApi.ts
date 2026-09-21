import "server-only";

import {
  createSign,
} from "node:crypto";

const TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";

const PACKAGE_NAME =
  "io.ayzo.app";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

let cachedAccessToken:
  | {
      token: string;
      expiresAtMs: number;
    }
  | null =
    null;

function base64Url(
  value: string | Buffer
) {
  return Buffer
    .from(value)
    .toString("base64url");
}

function serviceAccount():
  ServiceAccount {
  const raw =
    process.env
      .GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
      ?.trim();

  if (!raw) {
    throw new Error(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured."
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid Google Play service account JSON."
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error(
      "Invalid Google Play service account."
    );
  }

  const row =
    parsed as Record<
      string,
      unknown
    >;

  if (
    typeof row.client_email !==
      "string" ||
    typeof row.private_key !==
      "string"
  ) {
    throw new Error(
      "Incomplete Google Play service account."
    );
  }

  return {
    client_email:
      row.client_email,

    private_key:
      row.private_key,
  };
}

async function accessToken() {
  const now =
    Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken
      .expiresAtMs >
      now + 60_000
  ) {
    return cachedAccessToken
      .token;
  }

  const account =
    serviceAccount();

  const nowSeconds =
    Math.floor(
      now / 1000
    );

  const header =
    base64Url(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT",
      })
    );

  const claims =
    base64Url(
      JSON.stringify({
        iss:
          account.client_email,

        scope:
          ANDROID_PUBLISHER_SCOPE,

        aud:
          TOKEN_URL,

        iat:
          nowSeconds,

        exp:
          nowSeconds + 3600,
      })
    );

  const unsigned =
    `${header}.${claims}`;

  const signer =
    createSign(
      "RSA-SHA256"
    );

  signer.update(
    unsigned
  );

  signer.end();

  const signature =
    signer.sign(
      account.private_key
    );

  const assertion =
    `${unsigned}.${base64Url(
      signature
    )}`;

  const response =
    await fetch(
      TOKEN_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            grant_type:
              "urn:ietf:params:oauth:grant-type:jwt-bearer",

            assertion,
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      "GOOGLE_PLAY_OAUTH_FAILED"
    );
  }

  const payload:
    unknown =
      await response.json();

  if (
    typeof payload !==
      "object" ||
    payload === null
  ) {
    throw new Error(
      "GOOGLE_PLAY_OAUTH_INVALID_RESPONSE"
    );
  }

  const row =
    payload as Record<
      string,
      unknown
    >;

  if (
    typeof row.access_token !==
      "string" ||
    typeof row.expires_in !==
      "number"
  ) {
    throw new Error(
      "GOOGLE_PLAY_OAUTH_INVALID_RESPONSE"
    );
  }

  cachedAccessToken = {
    token:
      row.access_token,

    expiresAtMs:
      now +
      row.expires_in *
        1000,
  };

  return row.access_token;
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
