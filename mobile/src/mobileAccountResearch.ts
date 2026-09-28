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

export type MobileSavedAnalysis = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  title: string | null;
  created_at: string;
};

export type MobileWatchlist = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type MobileEvidenceSnapshot = {
  id: string;
  network: string;
  subject_type: string;
  subject_value: string;
  captured_at: string;
  created_at: string;
};

export type MobileAccountResearch = {
  plan: PlanId;

  features: {
    historicalChanges: boolean;
    walletProfiler: boolean;
  };

  savedAnalyses:
    MobileSavedAnalysis[];

  savedAnalysesUnavailable:
    boolean;

  watchlists:
    MobileWatchlist[];

  watchlistsUnavailable:
    boolean;

  evidenceSnapshots:
    MobileEvidenceSnapshot[];

  evidenceUnavailable:
    boolean;

  evidenceRetention:
    number;
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

export async function getMobileAccountResearch():
  Promise<MobileAccountResearch> {
  const headers =
    await getMobileAuthHeaders();

  const response =
    await CapacitorHttp.request({
      url:
        `${MOBILE_API_BASE_URL}/api/mobile/account/research`,
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
    !validPlan(
      body?.plan
    ) ||
    !Array.isArray(
      body?.savedAnalyses
    ) ||
    !Array.isArray(
      body?.watchlists
    ) ||
    !Array.isArray(
      body?.evidenceSnapshots
    )
  ) {
    throw new Error(
      body?.error ??
      "AYZO research library is unavailable."
    );
  }

  return {
    plan:
      body.plan,

    features: {
      historicalChanges:
        body?.features
          ?.historicalChanges ===
        true,

      walletProfiler:
        body?.features
          ?.walletProfiler ===
        true,
    },

    savedAnalyses:
      body.savedAnalyses,

    savedAnalysesUnavailable:
      body.savedAnalysesUnavailable ===
      true,

    watchlists:
      body.watchlists,

    watchlistsUnavailable:
      body.watchlistsUnavailable ===
      true,

    evidenceSnapshots:
      body.evidenceSnapshots,

    evidenceUnavailable:
      body.evidenceUnavailable ===
      true,

    evidenceRetention:
      typeof body.evidenceRetention ===
        "number" &&
      Number.isFinite(
        body.evidenceRetention
      )
        ? body.evidenceRetention
        : 20,
  };
}
