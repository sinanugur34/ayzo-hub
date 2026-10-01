"use client";

import CosmosSdkIntelligenceReport from "@/components/CosmosSdkIntelligenceReport";

export default function CosmosIntelligenceReport({
  address,
}: {
  address:
    string;
}) {
  return (
    <CosmosSdkIntelligenceReport
      address={
        address
      }
      network="cosmos"
    />
  );
}
