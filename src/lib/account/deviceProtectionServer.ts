import "server-only";

import {
  createHmac,
} from "node:crypto";

import {
  cookies,
  headers,
} from "next/headers";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getInternalApiKey,
} from "@/lib/apiSecurity";

import {
  createDeviceToken,
  describeDevice,
  DEVICE_COOKIE_NAME,
  hashDeviceToken,
  hashSecuritySignal,
} from "@/lib/account/deviceProtection";

export type DeviceSessionState = {
  sessionId:
    string | null;

  active:
    boolean;

  revokeReason:
    string | null;

  registered:
    boolean;
};

type RpcDeviceRow = {
  session_id?:
    unknown;

  active?:
    unknown;

  revoke_reason?:
    unknown;

  is_new?:
    unknown;

  revoked_session_id?:
    unknown;
};

function firstRow(
  value: unknown
): RpcDeviceRow | null {
  if (
    !Array.isArray(
      value
    ) ||
    value.length === 0 ||
    !value[0] ||
    typeof value[0] !==
      "object"
  ) {
    return null;
  }

  return value[0] as
    RpcDeviceRow;
}

function readString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function getSecuritySecret() {
  /*
   * Derive a purpose-specific HMAC key instead
   * of using the internal API credential directly
   * for account-device telemetry hashing.
   *
   * Domain separation prevents cross-protocol
   * reuse of the same raw key material.
   */
  return createHmac(
    "sha256",
    getInternalApiKey()
  )
    .update(
      "ayzo:account-device-signals:v1"
    )
    .digest(
      "hex"
    );
}

function readClientIpFromHeaders(
  headerStore: Headers
) {
  const forwarded =
    headerStore.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ||
      null
    );
  }

  return (
    headerStore.get(
      "cf-connecting-ip"
    ) ||
    headerStore.get(
      "x-real-ip"
    ) ||
    null
  );
}

async function requestSignals() {
  const headerStore =
    await headers();

  const userAgent =
    headerStore.get(
      "user-agent"
    );

  const ip =
    readClientIpFromHeaders(
      headerStore
    );

  const secret =
    getSecuritySecret();

  return {
    deviceLabel:
      describeDevice(
        userAgent
      ),

    userAgentHash:
      hashSecuritySignal(
        userAgent,
        secret
      ),

    ipHash:
      hashSecuritySignal(
        ip,
        secret
      ),
  };
}

export async function registerAccountDevice({
  userId,
  deviceToken,
}: {
  userId: string;
  deviceToken: string;
}) {
  const signals =
    await requestSignals();

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_register_account_device",
      {
        p_user_id:
          userId,

        p_device_token_hash:
          hashDeviceToken(
            deviceToken
          ),

        p_device_label:
          signals.deviceLabel,

        p_user_agent_hash:
          signals.userAgentHash,

        p_ip_hash:
          signals.ipHash,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    firstRow(
      data
    );

  if (
    !row ||
    !readString(
      row.session_id
    )
  ) {
    throw new Error(
      "DEVICE_REGISTRATION_FAILED"
    );
  }

  return {
    sessionId:
      readString(
        row.session_id
      )!,

    isNew:
      row.is_new ===
        true,

    revokedSessionId:
      readString(
        row.revoked_session_id
      ),
  };
}

export async function bootstrapAccountDevice({
  userId,
  deviceToken,
}: {
  userId: string;
  deviceToken: string;
}) {
  const signals =
    await requestSignals();

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_bootstrap_account_device",
      {
        p_user_id:
          userId,

        p_device_token_hash:
          hashDeviceToken(
            deviceToken
          ),

        p_device_label:
          signals.deviceLabel,

        p_user_agent_hash:
          signals.userAgentHash,

        p_ip_hash:
          signals.ipHash,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    firstRow(
      data
    );

  if (
    !row ||
    !readString(
      row.session_id
    )
  ) {
    throw new Error(
      "DEVICE_BOOTSTRAP_FAILED"
    );
  }

  return {
    sessionId:
      readString(
        row.session_id
      )!,

    isNew:
      row.is_new ===
        true,

    revokedSessionId:
      readString(
        row.revoked_session_id
      ),
  };
}


export async function touchAccountDevice({
  userId,
  deviceToken,
}: {
  userId: string;
  deviceToken: string;
}): Promise<
  DeviceSessionState
> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "ayzo_touch_account_device",
      {
        p_user_id:
          userId,

        p_device_token_hash:
          hashDeviceToken(
            deviceToken
          ),
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    firstRow(
      data
    );

  if (!row) {
    return {
      sessionId:
        null,

      active:
        false,

      revokeReason:
        null,

      registered:
        false,
    };
  }

  return {
    sessionId:
      readString(
        row.session_id
      ),

    active:
      row.active ===
        true,

    revokeReason:
      readString(
        row.revoke_reason
      ),

    registered:
      true,
  };
}

export async function ensureCurrentAccountDevice({
  userId,
  deviceToken,
}: {
  userId: string;
  deviceToken: string;
}): Promise<
  DeviceSessionState
> {
  const touched =
    await touchAccountDevice({
      userId,
      deviceToken,
    });

  /*
   * Legacy authenticated AYZO sessions created before
   * Device Protection V1 may have no ledger row.
   *
   * Bootstrap is intentionally separate from genuine
   * authentication registration. The database permits
   * bootstrap only when this account has zero historical
   * device rows.
   *
   * Once any device history exists, an unknown token
   * fails closed. This prevents a revoked device from
   * deleting/replacing its cookie and registering itself
   * again without a genuine authentication event.
   */
  if (
    !touched.registered
  ) {
    const bootstrap =
      await bootstrapAccountDevice({
        userId,
        deviceToken,
      });

    return {
      sessionId:
        bootstrap.sessionId,

      active:
        true,

      revokeReason:
        null,

      registered:
        true,
    };
  }

  return touched;
}

export async function getCurrentDeviceToken() {
  const cookieStore =
    await cookies();

  return (
    cookieStore
      .get(
        DEVICE_COOKIE_NAME
      )
      ?.value ??
    null
  );
}

export function isRevokedDeviceError(
  error: unknown
) {
  return (
    error instanceof Error &&
    error.message.includes(
      "DEVICE_SESSION_REVOKED"
    )
  );
}

export function newDeviceToken() {
  return createDeviceToken();
}
