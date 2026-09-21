import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { CapacitorHttp } from "@capacitor/core";
import { supabase } from "./supabase";

export const MOBILE_API_BASE_URL =
  "https://app.ayzo.io";

const DEVICE_TOKEN_KEY =
  "ayzo:device-token";

const DEVICE_TOKEN_BYTES =
  32;

const DEVICE_TOKEN_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

function bytesToBase64Url(
  bytes: Uint8Array
) {
  let binary = "";

  for (const byte of bytes) {
    binary +=
      String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createDeviceToken() {
  const bytes =
    new Uint8Array(
      DEVICE_TOKEN_BYTES
    );

  crypto.getRandomValues(
    bytes
  );

  const token =
    bytesToBase64Url(
      bytes
    );

  if (
    !DEVICE_TOKEN_PATTERN.test(
      token
    )
  ) {
    throw new Error(
      "Generated AYZO device token is invalid."
    );
  }

  return token;
}

async function getOrCreateDeviceToken() {
  const existing =
    await SecureStorage.get(
      DEVICE_TOKEN_KEY
    );

  if (
    typeof existing === "string" &&
    DEVICE_TOKEN_PATTERN.test(
      existing
    )
  ) {
    return existing;
  }

  const token =
    createDeviceToken();

  await SecureStorage.set(
    DEVICE_TOKEN_KEY,
    token
  );

  return token;
}

async function getAccessToken() {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession();

  if (
    error ||
    !data.session?.access_token
  ) {
    throw (
      error ??
      new Error(
        "AYZO authentication session is unavailable."
      )
    );
  }

  return data.session.access_token;
}

export async function getMobileAuthHeaders() {
  const [
    accessToken,
    deviceToken,
  ] =
    await Promise.all([
      getAccessToken(),
      getOrCreateDeviceToken(),
    ]);

  return {
    Authorization:
      `Bearer ${accessToken}`,
    "x-ayzo-device-token":
      deviceToken,
    Accept:
      "application/json",
  };
}

async function requestMobileSession(
  method: "GET" | "POST"
) {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/session`,
      method,
      headers,
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok
  ) {
    const error =
      new Error(
        body?.error ??
        "AYZO mobile session request failed."
      );

    Object.assign(
      error,
      {
        status:
          response.status,
        code:
          body?.code,
      }
    );

    throw error;
  }

  return body;
}

export function registerMobileSession() {
  return requestMobileSession(
    "POST"
  );
}

export function validateMobileSession() {
  return requestMobileSession(
    "GET"
  );
}

export function clearMobileDeviceToken() {
  return SecureStorage.remove(
    DEVICE_TOKEN_KEY
  );
}
