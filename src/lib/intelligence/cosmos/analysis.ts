import {
  buildCosmosSdkDerivedAnalysis,
} from "@/lib/intelligence/cosmosSdk";

export {
  type CosmosSdkDerivedAnalysis as CosmosDerivedAnalysis,
} from "@/lib/intelligence/cosmosSdk";

export function buildCosmosDerivedAnalysis(
  ...args:
    Parameters<
      typeof buildCosmosSdkDerivedAnalysis
    >
) {
  return buildCosmosSdkDerivedAnalysis(
    ...args
  );
}
