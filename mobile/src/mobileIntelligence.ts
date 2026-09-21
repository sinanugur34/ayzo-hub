import {
  CapacitorHttp,
} from "@capacitor/core";

import type {
  NetworkId,
} from "../../src/lib/networks/registry";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

export type MobileAnalysisResult = {
  networkId: NetworkId;
  address: string;
  data: unknown;
};

export async function analyzeMobileAddress({
  networkId,
  address,
}: {
  networkId: NetworkId;
  address: string;
}): Promise<MobileAnalysisResult> {
  const trimmed =
    address.trim();

  if (!trimmed) {
    throw new Error(
      "Enter a wallet, token or contract address."
    );
  }

  const authHeaders =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/intelligence`,
      method:
        "POST",
      headers: {
        ...authHeaders,
        "Content-Type":
          "application/json",
      },
      data: {
        network:
          networkId,
        address:
          trimmed,
      },
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    const error =
      new Error(
        body?.error ??
        "AYZO analysis request failed."
      );

    Object.assign(
      error,
      {
        status:
          response.status,
        code:
          body?.code,
        body,
      }
    );

    throw error;
  }

  return {
    networkId,
    address:
      trimmed,
    data:
      body,
  };
}
