import {
  CapacitorHttp,
} from "@capacitor/core";

import type {
  PlanId,
} from "../../src/lib/plans/types";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

import {
  readMobileQuotaStatus,
  type MobileQuotaStatus,
} from "./mobileQuota";

export type MobileAccountStatus = {
  plan: PlanId;
  quota: MobileQuotaStatus;
  billingAvailable: boolean;
};

function validPlan(
  value: unknown
): value is PlanId {
  return (
    value === "free" ||
    value === "pro" ||
    value === "advanced"
  );
}

export async function getMobileAccountStatus():
  Promise<MobileAccountStatus> {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/status`,

      method:
        "GET",

      headers,
    });

  const body =
    response.data;

  const quota =
    readMobileQuotaStatus(
      body?.quota
    );

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok ||
    !validPlan(
      body?.plan
    ) ||
    !quota
  ) {
    throw new Error(
      body?.error ??
      "AYZO account status is unavailable."
    );
  }

  return {
    plan:
      body.plan,

    quota,

    billingAvailable:
      body.billingAvailable ===
      true,
  };
}
