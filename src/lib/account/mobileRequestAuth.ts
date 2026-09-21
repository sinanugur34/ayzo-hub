import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidDeviceToken } from "@/lib/account/deviceProtection";
import { touchAccountDevice } from "@/lib/account/deviceProtectionServer";
import {
  MOBILE_DEVICE_TOKEN_HEADER,
  normalizeAuthEmail,
  readBearerToken,
} from "@/lib/account/mobileSessionAuthCore";

type MobileRequestFailure = {
  ok: false;
  status: number;
  code:
    | "AUTH_REQUIRED"
    | "INVALID_DEVICE_TOKEN"
    | "DEVICE_NOT_REGISTERED"
    | "DEVICE_SESSION_REVOKED"
    | "DEVICE_VALIDATION_FAILED";
  error: string;
};

function failure(
  status: number,
  code: MobileRequestFailure["code"],
  error: string
): MobileRequestFailure {
  return {
    ok: false,
    status,
    code,
    error,
  };
}

export async function authenticateMobileRequest(
  request: Request
) {
  const accessToken =
    readBearerToken(request);

  if (!accessToken) {
    return failure(
      401,
      "AUTH_REQUIRED",
      "A valid AYZO authentication session is required."
    );
  }

  const deviceToken =
    request.headers
      .get(MOBILE_DEVICE_TOKEN_HEADER)
      ?.trim() ?? "";

  if (!isValidDeviceToken(deviceToken)) {
    return failure(
      400,
      "INVALID_DEVICE_TOKEN",
      "The AYZO device token is invalid."
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.auth.getUser(
    accessToken
  );

  if (
    error ||
    !data.user?.id
  ) {
    return failure(
      401,
      "AUTH_REQUIRED",
      "The AYZO authentication session is invalid or expired."
    );
  }

  try {
    const device =
      await touchAccountDevice({
        userId: data.user.id,
        deviceToken,
      });

    if (!device.registered) {
      return failure(
        401,
        "DEVICE_NOT_REGISTERED",
        "This device is not registered to the AYZO account."
      );
    }

    if (!device.active) {
      return failure(
        401,
        "DEVICE_SESSION_REVOKED",
        "This AYZO device session is no longer active."
      );
    }

    return {
      ok: true as const,
      status: 200,
      identity: {
        userId: data.user.id,
        userEmail:
          normalizeAuthEmail(
            data.user.email
          ),
        deviceToken,
        deviceSessionId:
          device.sessionId,
      },
    };
  } catch {
    return failure(
      503,
      "DEVICE_VALIDATION_FAILED",
      "AYZO could not securely validate this device."
    );
  }
}
