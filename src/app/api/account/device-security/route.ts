import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  getCurrentDeviceToken,
} from "@/lib/account/deviceProtectionServer";

import {
  hashDeviceToken,
} from "@/lib/account/deviceProtection";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

export async function GET() {
  const {
    userId,
    deviceSessionId,
    deviceRevoked,
  } =
    await getAuthenticatedAccountContext();

  if (
    !userId ||
    !deviceSessionId
  ) {
    return noStoreJson(
      {
        error:
          deviceRevoked
            ? "DEVICE_REVOKED"
            : "Unauthorized",
      },
      401
    );
  }

  const admin =
    createAdminClient();

  const [
    devicesResult,
    notificationsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "account_device_sessions"
        )
        .select(`
          id,
          device_label,
          created_at,
          last_login_at,
          last_seen_at
        `)
        .eq(
          "user_id",
          userId
        )
        .is(
          "revoked_at",
          null
        )
        .order(
          "last_seen_at",
          {
            ascending:
              false,
          }
        )
        .limit(2),

      admin
        .from(
          "account_device_notifications"
        )
        .select(`
          id,
          event_type,
          actor_device_label,
          created_at
        `)
        .eq(
          "user_id",
          userId
        )
        .eq(
          "recipient_device_session_id",
          deviceSessionId
        )
        .is(
          "seen_at",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10),
    ]);

  if (
    devicesResult.error ||
    notificationsResult.error
  ) {
    return noStoreJson(
      {
        error:
          "Unable to load device security.",
      },
      500
    );
  }

  return noStoreJson({
    currentSessionId:
      deviceSessionId,

    maxActiveDevices:
      2,

    devices:
      devicesResult.data ??
      [],

    notifications:
      notificationsResult.data ??
      [],
  });
}

export async function POST(
  request: NextRequest
) {
  const {
    userId,
    deviceSessionId,
    deviceRevoked,
  } =
    await getAuthenticatedAccountContext();

  if (
    !userId ||
    !deviceSessionId
  ) {
    return noStoreJson(
      {
        error:
          deviceRevoked
            ? "DEVICE_REVOKED"
            : "Unauthorized",
      },
      401
    );
  }

  const body:
    unknown =
      await request
        .json()
        .catch(
          () => null
        );

  if (!isRecord(body)) {
    return noStoreJson(
      {
        error:
          "Invalid request.",
      },
      400
    );
  }

  const action =
    typeof body.action ===
      "string"
      ? body.action
      : null;

  const admin =
    createAdminClient();

  if (
    action ===
      "revoke_device"
  ) {
    const sessionId =
      typeof body.sessionId ===
        "string"
        ? body.sessionId
        : null;

    if (!sessionId) {
      return noStoreJson(
        {
          error:
            "Invalid session.",
        },
        400
      );
    }

    if (
      sessionId ===
        deviceSessionId
    ) {
      return noStoreJson(
        {
          error:
            "Use local sign out for the current device.",
        },
        400
      );
    }

    const {
      data,
      error,
    } =
      await admin
        .from(
          "account_device_sessions"
        )
        .update({
          revoked_at:
            new Date()
              .toISOString(),

          revoke_reason:
            "user_revoked",
        })
        .eq(
          "id",
          sessionId
        )
        .eq(
          "user_id",
          userId
        )
        .is(
          "revoked_at",
          null
        )
        .select(
          "id"
        )
        .maybeSingle();

    if (error) {
      return noStoreJson(
        {
          error:
            "Unable to sign out device.",
        },
        500
      );
    }

    if (!data) {
      return noStoreJson(
        {
          error:
            "Device session not found.",
        },
        404
      );
    }

    return noStoreJson({
      ok:
        true,
    });
  }

  if (
    action ===
      "revoke_current"
  ) {
    const token =
      await getCurrentDeviceToken();

    if (!token) {
      return noStoreJson(
        {
          error:
            "Device token unavailable.",
        },
        400
      );
    }

    const {
      error,
    } =
      await admin
        .rpc(
          "ayzo_revoke_account_device",
          {
            p_user_id:
              userId,

            p_device_token_hash:
              hashDeviceToken(
                token
              ),

            p_reason:
              "user_signout",
          }
        );

    if (error) {
      return noStoreJson(
        {
          error:
            "Unable to close device session.",
        },
        500
      );
    }

    return noStoreJson({
      ok:
        true,
    });
  }

  if (
    action ===
      "ack_notifications"
  ) {
    const notificationIds =
      Array.isArray(
        body.notificationIds
      )
        ? body.notificationIds
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                  "string"
            )
            .slice(
              0,
              20
            )
        : [];

    if (
      notificationIds.length ===
        0
    ) {
      return noStoreJson({
        ok:
          true,
      });
    }

    const {
      error,
    } =
      await admin
        .from(
          "account_device_notifications"
        )
        .update({
          seen_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          userId
        )
        .eq(
          "recipient_device_session_id",
          deviceSessionId
        )
        .in(
          "id",
          notificationIds
        );

    if (error) {
      return noStoreJson(
        {
          error:
            "Unable to acknowledge security notifications.",
        },
        500
      );
    }

    return noStoreJson({
      ok:
        true,
    });
  }

  return noStoreJson(
    {
      error:
        "Unsupported action.",
    },
    400
  );
}
