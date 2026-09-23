import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  isValidDeviceToken,
} from "@/lib/account/deviceProtection";

import {
  isRevokedDeviceError,
  registerAccountDevice,
  touchAccountDevice,
} from "@/lib/account/deviceProtectionServer";

import {
  isFreshAuthenticationToken,
  MOBILE_DEVICE_TOKEN_HEADER,
  normalizeAuthEmail,
  readBearerToken,
} from "@/lib/account/mobileSessionAuthCore";

import {
  recordSignupSource,
} from "@/lib/account/signupSourceServer";

type MobileSessionErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_DEVICE_TOKEN"
  | "REAUTH_REQUIRED"
  | "DEVICE_NOT_REGISTERED"
  | "DEVICE_SESSION_REVOKED"
  | "DEVICE_REGISTRATION_FAILED"
  | "DEVICE_VALIDATION_FAILED";

type MobileSessionFailure = {
  ok: false;
  status: number;
  code:
    MobileSessionErrorCode;
  error: string;
};

type VerifiedMobileIdentity = {
  userId: string;
  userEmail: string | null;
  deviceToken: string;
};

function failure(
  status: number,
  code:
    MobileSessionErrorCode,
  error: string
): MobileSessionFailure {
  return {
    ok: false,
    status,
    code,
    error,
  };
}

async function verifyMobileIdentity(
  request: Request,
  {
    requireFreshAuth,
  }: {
    requireFreshAuth: boolean;
  }
):
  Promise<
    | {
        ok: true;
        identity:
          VerifiedMobileIdentity;
      }
    | MobileSessionFailure
  > {
  const accessToken =
    readBearerToken(
      request
    );

  if (!accessToken) {
    return failure(
      401,
      "AUTH_REQUIRED",
      "A valid AYZO authentication session is required."
    );
  }

  const deviceToken =
    request.headers
      .get(
        MOBILE_DEVICE_TOKEN_HEADER
      )
      ?.trim() ??
    "";

  if (
    !isValidDeviceToken(
      deviceToken
    )
  ) {
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
  } =
    await admin.auth
      .getUser(
        accessToken
      );

  const user =
    data.user;

  if (
    error ||
    !user?.id
  ) {
    return failure(
      401,
      "AUTH_REQUIRED",
      "The AYZO authentication session is invalid or expired."
    );
  }

  /*
   * getUser(accessToken) above verifies the exact
   * bearer token with Supabase Auth.
   *
   * Device registration freshness is then bound
   * to authentication evidence carried by that
   * same verified session token.
   */
  if (
    requireFreshAuth &&
    !isFreshAuthenticationToken(
      accessToken
    )
  ) {
    return failure(
      401,
      "REAUTH_REQUIRED",
      "A fresh AYZO sign-in is required to register this device."
    );
  }

  return {
    ok: true,
    identity: {
      userId:
        user.id,

      userEmail:
        normalizeAuthEmail(
          user.email
        ),

      deviceToken,
    },
  };
}

export async function registerMobileSession(
  request: Request
) {
  const verified =
    await verifyMobileIdentity(
      request,
      {
        requireFreshAuth:
          true,
      }
    );

  if (!verified.ok) {
    return verified;
  }

  const {
    userId,
    userEmail,
    deviceToken,
  } =
    verified.identity;

  try {
    const device =
      await registerAccountDevice({
        userId,
        deviceToken,
      });

    try {
      await recordSignupSource({
        userId,
        channel:
          "android",
        userAgent:
          request.headers.get(
            "user-agent"
          ),

        countryCode:
          request.headers.get(
            "x-vercel-ip-country"
          ),
      });
    } catch {
      /*
       * Signup-source analytics must
       * never break authentication.
       */
    }

    return {
      ok: true as const,
      status: 200,
      user: {
        id:
          userId,
        email:
          userEmail,
      },
      device: {
        sessionId:
          device.sessionId,
        isNew:
          device.isNew,
      },
    };
  } catch (error) {
    if (
      isRevokedDeviceError(
        error
      )
    ) {
      return failure(
        409,
        "DEVICE_SESSION_REVOKED",
        "This AYZO device session was revoked. Sign in again with a fresh device identity."
      );
    }

    return failure(
      503,
      "DEVICE_REGISTRATION_FAILED",
      "AYZO could not securely register this device."
    );
  }
}

export async function validateMobileSession(
  request: Request
) {
  const verified =
    await verifyMobileIdentity(
      request,
      {
        requireFreshAuth:
          false,
      }
    );

  if (!verified.ok) {
    return verified;
  }

  const {
    userId,
    userEmail,
    deviceToken,
  } =
    verified.identity;

  try {
    const device =
      await touchAccountDevice({
        userId,
        deviceToken,
      });

    if (
      !device.registered
    ) {
      return failure(
        401,
        "DEVICE_NOT_REGISTERED",
        "This device is not registered to the AYZO account."
      );
    }

    if (
      !device.active
    ) {
      return failure(
        401,
        "DEVICE_SESSION_REVOKED",
        "This AYZO device session is no longer active."
      );
    }

    return {
      ok: true as const,
      status: 200,
      user: {
        id:
          userId,
        email:
          userEmail,
      },
      device: {
        sessionId:
          device.sessionId,
        active:
          true,
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
