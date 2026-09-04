export type PlanId =
  | "free"
  | "pro"
  | "advanced";

export type PlanStatus =
  | "active"
  | "coming-soon";

export type BillingInterval =
  | "monthly"
  | "annual";

export type FeatureId =
  | "basicVerification"
  | "basicHolderIntelligence"
  | "basicRelationships"
  | "basicFunding"
  | "evidenceSummary"
  | "fundingProvenance"
  | "developerHistory"
  | "walletGraph"
  | "savedAnalyses"
  | "watchlists"
  | "historicalChanges"
  | "alerts"
  | "activityTimeline"
  | "entityLabels"
  | "walletTrackRecord"
  | "askAyzo"
  | "visualEvidenceGraph"
  | "marketFlowIntelligence"
  | "investigationTimeline"
  | "batchAnalysis"
  | "compareInvestigations"
  | "cases"
  | "evidenceLocker"
  | "customLabelsNotes"
  | "advancedWatchlists"
  | "customAlertRules"
  | "advancedReports"
  | "dataExport"
  | "apiAccess"
  | "teamWorkspace"
  | "noCodeDashboards"
  | "mobileApp"
  | "priorityAnalysis";

export type AnalysisQuota =
  | {
      kind: "fixed";
      period: "24h";
      count: number;
    }
  | {
      kind: "not-configured";
    };

export type PlanDefinition = {
  id: PlanId;
  name: string;
  status: PlanStatus;

  monthlyPriceUsd:
    number | null;

  annualPriceUsd:
    number | null;

  annualDiscountPercent:
    number | null;

  foundingPrice:
    boolean;

  checkoutEnabled:
    boolean;

  analysisQuota:
    AnalysisQuota;

  features: Readonly<
    Partial<
      Record<
        FeatureId,
        boolean
      >
    >
  >;

  roadmapFeatures:
    readonly FeatureId[];
};
