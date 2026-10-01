import {
  buildCosmosSdkDerivedAnalysis,
} from "@/lib/intelligence/cosmosSdk";

export {
  type CosmosSdkDerivedAnalysis as InjectiveDerivedAnalysis,
} from "@/lib/intelligence/cosmosSdk";

export function buildInjectiveDerivedAnalysis(
  ...args:
    Parameters<
      typeof buildCosmosSdkDerivedAnalysis
    >
) {
  return buildCosmosSdkDerivedAnalysis(
    ...args
  );
}
