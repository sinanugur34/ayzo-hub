import type {
  FeatureId,
  PlanDefinition,
  PlanId,
} from "./types";

const LIVE_PLATFORM_FEATURES = {
  basicVerification: true,
  basicHolderIntelligence: true,
  basicRelationships: true,
  basicFunding: true,
  evidenceSummary: true,
  fundingProvenance: true,
  developerHistory: true,
  walletGraph: true,
  savedAnalyses: true,
  watchlists: true,
} as const satisfies Partial<
  Record<
    FeatureId,
    boolean
  >
>;

const PRO_ROADMAP_FEATURES = [
  "historicalChanges",
  "alerts",
  "activityTimeline",
  "entityLabels",
  "walletTrackRecord",
  "askAyzo",
  "visualEvidenceGraph",
  "marketFlowIntelligence",
  "investigationTimeline",
  "advancedReports",
  "dataExport",
  "mobileApp",
] as const satisfies readonly FeatureId[];

const ADVANCED_ROADMAP_FEATURES = [
  ...PRO_ROADMAP_FEATURES,
  "batchAnalysis",
  "compareInvestigations",
  "cases",
  "evidenceLocker",
  "customLabelsNotes",
  "advancedWatchlists",
  "customAlertRules",
  "apiAccess",
  "teamWorkspace",
  "noCodeDashboards",
  "priorityAnalysis",
] as const satisfies readonly FeatureId[];

export const PLANS = {
  free: {
    id: "free",
    name: "AYZO Free",
    status: "active",

    monthlyPriceUsd:
      0,

    annualPriceUsd:
      null,

    annualDiscountPercent:
      null,

    foundingPrice:
      false,

    checkoutEnabled:
      false,

    analysisQuota: {
      kind: "fixed",
      period: "24h",
      count: 3,
    },

    features: {
      ...LIVE_PLATFORM_FEATURES,
    },

    roadmapFeatures:
      [],
  },

  pro: {
    id: "pro",
    name: "AYZO Pro",
    status: "coming-soon",

    monthlyPriceUsd:
      19,

    annualPriceUsd:
      193.8,

    annualDiscountPercent:
      15,

    foundingPrice:
      true,

    checkoutEnabled:
      false,

    analysisQuota: {
      kind: "fixed",
      period: "24h",
      count: 30,
    },

    features: {
      ...LIVE_PLATFORM_FEATURES,
    },

    roadmapFeatures:
      PRO_ROADMAP_FEATURES,
  },

  advanced: {
    id: "advanced",
    name: "AYZO Advanced",
    status: "coming-soon",

    /*
     * No public Advanced price
     * until its paid value and
     * entitlement are ready.
     */
    monthlyPriceUsd:
      null,

    annualPriceUsd:
      null,

    annualDiscountPercent:
      null,

    foundingPrice:
      false,

    checkoutEnabled:
      false,

    analysisQuota: {
      kind:
        "not-configured",
    },

    features: {
      ...LIVE_PLATFORM_FEATURES,
    },

    roadmapFeatures:
      ADVANCED_ROADMAP_FEATURES,
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
    Partial<
      Record<
        FeatureId,
        boolean
      >
    >
  > =
    PLANS[
      planId
    ].features;

  return (
    features[
      feature
    ] === true
  );
}

export function planHasRoadmapFeature(
  planId: PlanId,
  feature: FeatureId
) {
  const roadmap:
    readonly FeatureId[] =
      PLANS[
        planId
      ].roadmapFeatures;

  return roadmap.includes(
    feature
  );
}

export function planCanCheckout(
  planId: PlanId
) {
  const plan =
    PLANS[planId];

  return (
    plan.status ===
      "active" &&
    plan.checkoutEnabled
  );
}
