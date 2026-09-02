export type EvmEntityCategory =
  | "burn"
  | "cex"
  | "dex"
  | "liquidity_pool"
  | "treasury"
  | "bridge"
  | "staking"
  | "vesting"
  | "contract"
  | "unknown";

export type EvmEntityLabelSource =
  | "deterministic"
  | "provider"
  | "onchain"
  | "manual";

export type EvmEntityLabelConfidence =
  | "high"
  | "medium"
  | "low";

export type EvmEntityLabel = {
  address: string;
  category: EvmEntityCategory;
  label: string | null;
  confidence: EvmEntityLabelConfidence;
  source: EvmEntityLabelSource;

  /**
   * Whether this holder should be excluded
   * from adjusted ownership concentration.
   *
   * This does NOT remove the holder from
   * raw on-chain concentration metrics.
   */
  excludeFromAdjustedConcentration: boolean;
};

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const DEAD_ADDRESS =
  "0x000000000000000000000000000000000000dead";

function normalizeAddress(
  address: string
): string | null {
  const normalized =
    address.trim().toLowerCase();

  return EVM_ADDRESS.test(normalized)
    ? normalized
    : null;
}

/**
 * Deterministic labels must only contain
 * identities we can establish without
 * inference or third-party attribution.
 */
export function getDeterministicEvmEntityLabel(
  address: string
): EvmEntityLabel | null {
  const normalized =
    normalizeAddress(address);

  if (!normalized) {
    return null;
  }

  if (normalized === ZERO_ADDRESS) {
    return {
      address: normalized,
      category: "burn",
      label: "Zero Address",
      confidence: "high",
      source: "deterministic",
      excludeFromAdjustedConcentration: true,
    };
  }

  if (normalized === DEAD_ADDRESS) {
    return {
      address: normalized,
      category: "burn",
      label: "Dead Address",
      confidence: "high",
      source: "deterministic",
      excludeFromAdjustedConcentration: true,
    };
  }

  return null;
}

export function mergeEvmEntityLabels(
  labels: readonly EvmEntityLabel[]
): readonly EvmEntityLabel[] {
  const byAddress =
    new Map<string, EvmEntityLabel>();

  const sourcePriority:
    Record<EvmEntityLabelSource, number> = {
      deterministic: 4,
      onchain: 3,
      provider: 2,
      manual: 1,
    };

  const confidencePriority:
    Record<EvmEntityLabelConfidence, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

  for (const label of labels) {
    const address =
      normalizeAddress(label.address);

    if (!address) {
      continue;
    }

    const candidate: EvmEntityLabel = {
      ...label,
      address,
    };

    const existing =
      byAddress.get(address);

    if (!existing) {
      byAddress.set(
        address,
        candidate
      );

      continue;
    }

    const candidateSource =
      sourcePriority[candidate.source];

    const existingSource =
      sourcePriority[existing.source];

    const shouldReplace =
      candidateSource >
        existingSource ||
      (
        candidateSource ===
          existingSource &&
        confidencePriority[
          candidate.confidence
        ] >
          confidencePriority[
            existing.confidence
          ]
      );

    if (shouldReplace) {
      byAddress.set(
        address,
        candidate
      );
    }
  }

  return [...byAddress.values()];
}

export function indexEvmEntityLabels(
  labels: readonly EvmEntityLabel[]
): ReadonlyMap<string, EvmEntityLabel> {
  return new Map(
    mergeEvmEntityLabels(labels)
      .map(
        label => [
          label.address.toLowerCase(),
          label,
        ] as const
      )
  );
}
