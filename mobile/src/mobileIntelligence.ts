import {
  CapacitorHttp,
} from "@capacitor/core";

import type {
  NetworkId,
} from "../../src/lib/networks/registry";

import type {
  PlanId,
} from "../../src/lib/plans/types";

import {
  resolveSelectedNetworkForAddress,
  type AddressKind,
} from "../../src/lib/networks/addressSelection";

import {
  getMobileAuthHeaders,
  MOBILE_API_BASE_URL,
} from "./mobileSession";

import {
  readMobileQuotaStatus,
  type MobileQuotaStatus,
} from "./mobileQuota";

export type MobileAnalysisResult = {
  networkId: NetworkId;
  address: string;
  data: unknown;
  plan: PlanId | null;
  quota: MobileQuotaStatus | null;
};

export class MobileAnalysisError extends Error {
  status: number | null;
  code: string | null;
  plan: PlanId | null;
  quota: MobileQuotaStatus | null;

  constructor({
    message,
    status,
    code,
    plan,
    quota,
  }: {
    message: string;
    status?: number | null;
    code?: string | null;
    plan?: PlanId | null;
    quota?: MobileQuotaStatus | null;
  }) {
    super(message);

    this.name =
      "MobileAnalysisError";

    this.status =
      status ?? null;

    this.code =
      code ?? null;

    this.plan =
      plan ?? null;

    this.quota =
      quota ?? null;
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readPlan(
  value: unknown
): PlanId | null {
  return (
    value === "free" ||
    value === "pro" ||
    value === "advanced"
  )
    ? value
    : null;
}

function readSuccessMobileMeta(
  body: unknown
) {
  if (
    !isRecord(body) ||
    !isRecord(body.mobile)
  ) {
    return {
      plan:
        null,
      quota:
        null,
    };
  }

  return {
    plan:
      readPlan(
        body.mobile.plan
      ),
    quota:
      readMobileQuotaStatus(
        body.mobile.quota
      ),
  };
}

export async function detectMobileAddressNetwork({
  address,
  selectedNetworkId,
}: {
  address: string;
  selectedNetworkId: NetworkId;
}): Promise<NetworkId | null> {
  const trimmed =
    address.trim();

  if (!trimmed) {
    return null;
  }

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/address-detect`,
      method:
        "POST",
      headers: {
        Accept:
          "application/json",
        "Content-Type":
          "application/json",
      },
      data: {
        address:
          trimmed,
      },
    });

  const body =
    response.data;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body?.ok
  ) {
    return null;
  }

  const detected =
    body.network;

  const validKinds:
    readonly AddressKind[] = [
      "evm",
      "solana",
      "bitcoin",
      "dogecoin",
      "tron",
    ];

  if (
    typeof detected !== "string" ||
    !validKinds.includes(
      detected as AddressKind
    )
  ) {
    return null;
  }

  return resolveSelectedNetworkForAddress(
    selectedNetworkId,
    detected as AddressKind
  );
}

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
    throw new MobileAnalysisError({
      message:
        body?.error ??
        "AYZO analysis request failed.",
      status:
        response.status,
      code:
        typeof body?.code === "string"
          ? body.code
          : null,
      plan:
        readPlan(
          body?.plan
        ),
      quota:
        readMobileQuotaStatus(
          body?.quota
        ),
    });
  }

  const mobile =
    readSuccessMobileMeta(
      body
    );

  return {
    networkId,
    address:
      trimmed,
    data:
      body,
    plan:
      mobile.plan,
    quota:
      mobile.quota,
  };
}
