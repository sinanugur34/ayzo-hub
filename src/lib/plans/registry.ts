import type {
  FeatureId,
  PlanDefinition,
  PlanId,
} from "./types";

const CORE_FEATURES = {
  basicVerification: true,
  basicHolderIntelligence: true,
  basicRelationships: true,
  basicFunding: true,
  evidenceSummary: true,
} as const satisfies Partial<
  Record<FeatureId, boolean>
>;

export const PLANS = {
  free: {
    id: "free",
    name: "AYZO Free",
    status: "active",
    monthlyPriceUsd: 0,
    analysisQuota: {
      period: "24h",
      count: 3,
    },
    features: {
      ...CORE_FEATURES,
    },
  },

  pro: {
    id: "pro",
    name: "AYZO Pro",
    status: "coming-soon",
    monthlyPriceUsd: 19.99,
    analysisQuota: null,
    features: {
      ...CORE_FEATURES,
      fundingProvenance: true,
      developerHistory: true,
      walletGraph: true,
      historicalChanges: true,
      watchlists: true,
      alerts: true,
      activityTimeline: true,
      entityLabels: true,
      walletTrackRecord: true,
      askAyzo: true,
    },
  },

  advanced: {
    id: "advanced",
    name: "AYZO Advanced",
    status: "coming-soon",
    monthlyPriceUsd: 59,
    analysisQuota: null,
    features: {
      ...CORE_FEATURES,
      fundingProvenance: true,
      developerHistory: true,
      walletGraph: true,
      historicalChanges: true,
      watchlists: true,
      alerts: true,
      activityTimeline: true,
      entityLabels: true,
      walletTrackRecord: true,
      askAyzo: true,
      advancedReports: true,
      dataExport: true,
      priorityAnalysis: true,
    },
  },
} as const satisfies Record<
  PlanId,
  PlanDefinition
>;

export function getPlan(
  id: PlanId
): PlanDefinition {
  return PLANS[id];
}

export function planHasFeature(
  planId: PlanId,
  feature: FeatureId
) {
  const features: Readonly<
    Partial<Record<FeatureId, boolean>>
  > = PLANS[planId].features;

  return features[feature] === true;
}
