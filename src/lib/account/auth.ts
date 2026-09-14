import {
  createClient,
} from "@/lib/supabase/server";

import {
  ensureCurrentAccountDevice,
  getCurrentDeviceToken,
} from "@/lib/account/deviceProtectionServer";

export async function getAuthenticatedAccountContext() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    typeof data?.claims?.sub ===
      "string"
      ? data.claims.sub
      : null;

  const userEmail =
    typeof data?.claims?.email ===
      "string"
      ? data.claims.email
          .trim()
          .toLowerCase()
      : null;

  if (
    error ||
    !userId
  ) {
    return {
      supabase,

      userId:
        null,

      userEmail:
        null,

      deviceSessionId:
        null,

      deviceRevoked:
        false,

      deviceRevokeReason:
        null,
    };
  }

  const deviceToken =
    await getCurrentDeviceToken();

  /*
   * Protected AYZO account requests
   * must carry the HttpOnly device token
   * installed by the central proxy.
   */
  if (!deviceToken) {
    return {
      supabase,

      userId:
        null,

      userEmail:
        null,

      deviceSessionId:
        null,

      deviceRevoked:
        false,

      deviceRevokeReason:
        null,
    };
  }

  try {
    const device =
      await ensureCurrentAccountDevice({
        userId,
        deviceToken,
      });

    if (!device.active) {
      return {
        supabase,

        userId:
          null,

        userEmail:
          null,

        deviceSessionId:
          device.sessionId,

        deviceRevoked:
          true,

        deviceRevokeReason:
          device.revokeReason,
      };
    }

    return {
      supabase,
      userId,
      userEmail,

      deviceSessionId:
        device.sessionId,

      deviceRevoked:
        false,

      deviceRevokeReason:
        null,
    };
  } catch {
    /*
     * Account security fails closed.
     *
     * If the device ledger cannot be
     * validated, protected account data
     * must not be exposed.
     */
    return {
      supabase,

      userId:
        null,

      userEmail:
        null,

      deviceSessionId:
        null,

      deviceRevoked:
        false,

      deviceRevokeReason:
        null,
    };
  }
}
