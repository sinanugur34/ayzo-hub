import {
  CapacitorHttp,
} from "@capacitor/core";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

export type MobileAlertRule = {
  id: string;
  watchlist_id: string | null;
  network: string | null;
  subject_type: string | null;
  subject_value: string | null;
  rule_type: string;
  delivery_channel: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MobileAlertsResponse = {
  rules: MobileAlertRule[];
  plan: "free" | "pro" | "advanced";
  canManage: boolean;
  deliveryChannel: string;
};

export async function getMobileAlerts():
  Promise<MobileAlertsResponse> {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/alerts`,
      method:
        "GET",
      headers,
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok ||
    !Array.isArray(
      body?.rules
    )
  ) {
    throw new Error(
      body?.error ??
      "AYZO alerts are unavailable."
    );
  }

  return {
    rules:
      body.rules,
    plan:
      body.plan,
    canManage:
      body.canManage ===
      true,
    deliveryChannel:
      typeof body.deliveryChannel ===
        "string"
        ? body.deliveryChannel
        : "email",
  };
}
