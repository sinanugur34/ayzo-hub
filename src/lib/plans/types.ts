export type PlanId =
  | "free"
  | "pro"
  | "advanced";

export type PlanStatus =
  | "active"
  | "coming-soon";

export type FeatureId =
  | "basicVerification"
  | "basicHolderIntelligence"
  | "basicRelationships"
  | "basicFunding"
  | "evidenceSummary"
  | "fundingProvenance"
  | "developerHistory"
  | "walletGraph"
  | "historicalChanges"
  | "watchlists"
  | "alerts"
  | "activityTimeline"
  | "entityLabels"
  | "walletTrackRecord"
  | "askAyzo"
  | "advancedReports"
  | "dataExport"
  | "priorityAnalysis";

export type AnalysisQuota =
  | {
      period: "24h";
      count: number;
    }
  | null;

export type PlanDefinition = {
  id: PlanId;
  name: string;
  status: PlanStatus;
  monthlyPriceUsd: number | null;
  analysisQuota: AnalysisQuota;
  features: Readonly<
    Partial<Record<FeatureId, boolean>>
  >;
};
