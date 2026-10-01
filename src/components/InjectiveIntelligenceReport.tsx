"use client";

import CosmosSdkIntelligenceReport from "@/components/CosmosSdkIntelligenceReport";

export default function InjectiveIntelligenceReport({
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
      network="injective"
    />
  );
}
