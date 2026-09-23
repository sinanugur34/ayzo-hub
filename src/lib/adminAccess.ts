import "server-only";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  isConfiguredAdminUserId,
} from "@/lib/adminAccessPolicy";

export type AdminAccessResult = {
  authorized: boolean;
  userId: string | null;
  userEmail: string | null;
};

export async function getAdminAccess():
  Promise<AdminAccessResult> {
  const {
    userId,
    userEmail,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    return {
      authorized:
        false,

      userId:
        null,

      userEmail:
        null,
    };
  }

  return {
    authorized:
      isConfiguredAdminUserId(
        userId,
        process.env
          .AYZO_ADMIN_USER_IDS
      ),

    userId,

    userEmail,
  };
}

export async function requireAdmin() {
  const access =
    await getAdminAccess();

  if (
    !access.authorized ||
    !access.userId
  ) {
    throw new Error(
      "AYZO_ADMIN_ACCESS_DENIED"
    );
  }

  return {
    userId:
      access.userId,

    userEmail:
      access.userEmail,
  };
}
