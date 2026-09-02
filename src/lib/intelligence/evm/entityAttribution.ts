import {
  getDeterministicEvmEntityLabel,
  mergeEvmEntityLabels,
  type EvmEntityCategory,
  type EvmEntityLabel,
  type EvmEntityLabelConfidence,
  type EvmEntityLabelSource,
} from "./entityLabels";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export type EvmEntityEvidenceKind =
  | "provider_attribution"
  | "verified_contract"
  | "protocol_registry"
  | "onchain_behavior"
  | "manual_review";

export type EvmEntityEvidence = {
  address: string;
  category: EvmEntityCategory;
  label: string | null;
  confidence: EvmEntityLabelConfidence;
  source: Exclude<
    EvmEntityLabelSource,
    "deterministic"
  >;
  kind: EvmEntityEvidenceKind;

  /**
   * Human/machine-readable evidence reference.
   * Never treated as proof by itself.
   */
  reference: string | null;
};

export type EvmEntityAttribution = {
  address: string;
  label: EvmEntityLabel | null;
  evidence: readonly EvmEntityEvidence[];
  conflictingCategories:
    readonly EvmEntityCategory[];
};

const AUTO_EXCLUDABLE_CATEGORIES =
  new Set<EvmEntityCategory>([
    "burn",
    "cex",
    "liquidity_pool",
    "bridge",
    "staking",
  ]);

function normalizeAddress(
  address: string
): string | null {
  const normalized =
    address.trim().toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

/**
 * Conservative adjusted-concentration policy.
 *
 * RAW concentration is never changed.
 *
 * Only HIGH-confidence evidence in categories
 * that clearly represent custody/infrastructure
 * may be excluded automatically.
 *
 * Treasury and vesting are intentionally NOT
 * auto-excluded because they may represent
 * economically meaningful ownership.
 */
export function shouldExcludeEntityFromAdjustedConcentration(
  category: EvmEntityCategory,
  confidence: EvmEntityLabelConfidence
): boolean {
  return (
    confidence === "high" &&
    AUTO_EXCLUDABLE_CATEGORIES.has(
      category
    )
  );
}

function evidenceToLabel(
  evidence: EvmEntityEvidence
): EvmEntityLabel | null {
  const address =
    normalizeAddress(
      evidence.address
    );

  if (!address) {
    return null;
  }

  return {
    address,
    category:
      evidence.category,
    label:
      evidence.label,
    confidence:
      evidence.confidence,
    source:
      evidence.source,

    excludeFromAdjustedConcentration:
      shouldExcludeEntityFromAdjustedConcentration(
        evidence.category,
        evidence.confidence
      ),
  };
}

export function resolveEvmEntityAttribution(
  address: string,
  evidence:
    readonly EvmEntityEvidence[]
): EvmEntityAttribution {
  const normalized =
    normalizeAddress(address);

  if (!normalized) {
    return {
      address:
        address.trim().toLowerCase(),
      label: null,
      evidence: [],
      conflictingCategories: [],
    };
  }

  const matchingEvidence =
    evidence.filter(
      item =>
        normalizeAddress(
          item.address
        ) === normalized
    );

  const labels =
    matchingEvidence
      .map(evidenceToLabel)
      .filter(
        (
          label
        ): label is EvmEntityLabel =>
          label !== null
      );

  const deterministic =
    getDeterministicEvmEntityLabel(
      normalized
    );

  if (deterministic) {
    labels.push(
      deterministic
    );
  }

  const merged =
    mergeEvmEntityLabels(
      labels
    );

  const categories =
    new Set(
      matchingEvidence.map(
        item => item.category
      )
    );

  if (deterministic) {
    categories.add(
      deterministic.category
    );
  }

  return {
    address: normalized,
    label:
      merged.find(
        item =>
          item.address ===
          normalized
      ) ?? null,

    evidence:
      matchingEvidence,

    conflictingCategories:
      categories.size > 1
        ? [...categories]
        : [],
  };
}
