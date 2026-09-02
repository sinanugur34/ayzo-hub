import {
  getDeterministicEvmEntityLabel,
  indexEvmEntityLabels,
  mergeEvmEntityLabels,
  type EvmEntityCategory,
  type EvmEntityLabel,
  type EvmEntityLabelConfidence,
  type EvmEntityLabelSource,
} from "./entityLabels";

import type {
  EvmTokenHolder,
  EvmTokenHolders,
} from "./types";

export type EvmHolderConcentration = {
  top1Percent: number;
  top5Percent: number;
  top10Percent: number;
  top20Percent: number;
  top50Percent: number;
  top100Percent: number;
};

export type EvmHolderConcentrationSnapshot = {
  analyzedSupplyPercent: number;
  holdersAtOrAbove1Percent: number;
  holdersAtOrAbove5Percent: number;
  concentration: EvmHolderConcentration;
};

export type EvmHolderExclusion = {
  address: string;
  balance: string;
  rawSupplyPercent: number;
  category: EvmEntityCategory;
  label: string | null;
  confidence: EvmEntityLabelConfidence;
  source: EvmEntityLabelSource;
};

export type EvmAdjustedHolderIntelligence =
  EvmHolderConcentrationSnapshot & {
    eligibleHolderCount: number;
    excludedHolderCount: number;
    excludedSupplyPercent: number;
    adjustedSupplyBasePercent: number;
  };

export type EvmHolderIntelligence = {
  totalHolderCount: number | null;
  analyzedHolderCount: number;

  // Backward-compatible RAW metrics.
  analyzedSupplyPercent: number;
  holdersAtOrAbove1Percent: number;
  holdersAtOrAbove5Percent: number;
  concentration: EvmHolderConcentration;

  raw: EvmHolderConcentrationSnapshot;
  adjusted: EvmAdjustedHolderIntelligence;
  exclusions: readonly EvmHolderExclusion[];
};

function normalizePercent(
  value: number | null
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return 0;
  }

  return value;
}

function roundPercent(
  value: number
): number {
  return Number(
    value.toFixed(4)
  );
}

function sortByPercentage<
  T extends {
    percentage: number | null;
  },
>(
  holders: readonly T[]
): T[] {
  return [...holders].sort(
    (a, b) =>
      normalizePercent(
        b.percentage
      ) -
      normalizePercent(
        a.percentage
      )
  );
}

function sumTop(
  holders: readonly {
    percentage: number | null;
  }[],
  count: number
): number {
  const total = holders
    .slice(0, count)
    .reduce(
      (sum, holder) =>
        sum +
        normalizePercent(
          holder.percentage
        ),
      0
    );

  return roundPercent(total);
}

function buildSnapshot(
  holders: readonly {
    percentage: number | null;
  }[]
): EvmHolderConcentrationSnapshot {
  const sorted =
    sortByPercentage(holders);

  return {
    analyzedSupplyPercent:
      sumTop(
        sorted,
        sorted.length
      ),

    holdersAtOrAbove1Percent:
      sorted.filter(
        holder =>
          normalizePercent(
            holder.percentage
          ) >= 1
      ).length,

    holdersAtOrAbove5Percent:
      sorted.filter(
        holder =>
          normalizePercent(
            holder.percentage
          ) >= 5
      ).length,

    concentration: {
      top1Percent:
        sumTop(sorted, 1),
      top5Percent:
        sumTop(sorted, 5),
      top10Percent:
        sumTop(sorted, 10),
      top20Percent:
        sumTop(sorted, 20),
      top50Percent:
        sumTop(sorted, 50),
      top100Percent:
        sumTop(sorted, 100),
    },
  };
}

function deterministicLabelsForHolders(
  holders: readonly EvmTokenHolder[]
): EvmEntityLabel[] {
  return holders
    .map(
      holder =>
        getDeterministicEvmEntityLabel(
          holder.address
        )
    )
    .filter(
      (
        label
      ): label is EvmEntityLabel =>
        label !== null
    );
}

export function analyzeEvmTokenHolders(
  data: EvmTokenHolders,
  suppliedLabels:
    readonly EvmEntityLabel[] = []
): EvmHolderIntelligence {
  const rawHolders =
    sortByPercentage(
      data.holders
    );

  const raw =
    buildSnapshot(
      rawHolders
    );

  const labels =
    mergeEvmEntityLabels([
      ...suppliedLabels,
      ...deterministicLabelsForHolders(
        rawHolders
      ),
    ]);

  const labelIndex =
    indexEvmEntityLabels(
      labels
    );

  const exclusions:
    EvmHolderExclusion[] = [];

  const eligible:
    EvmTokenHolder[] = [];

  for (const holder of rawHolders) {
    const label =
      labelIndex.get(
        holder.address.toLowerCase()
      );

    if (
      label
        ?.excludeFromAdjustedConcentration
    ) {
      exclusions.push({
        address:
          holder.address.toLowerCase(),

        balance:
          holder.balance,

        rawSupplyPercent:
          roundPercent(
            normalizePercent(
              holder.percentage
            )
          ),

        category:
          label.category,

        label:
          label.label,

        confidence:
          label.confidence,

        source:
          label.source,
      });

      continue;
    }

    eligible.push(holder);
  }

  const excludedSupplyPercent =
    roundPercent(
      exclusions.reduce(
        (sum, item) =>
          sum +
          item.rawSupplyPercent,
        0
      )
    );

  const adjustedSupplyBasePercent =
    Math.max(
      0,
      roundPercent(
        100 -
          excludedSupplyPercent
      )
    );

  const adjustedHolders =
    eligible.map(
      holder => {
        const rawPercentage =
          normalizePercent(
            holder.percentage
          );

        const percentage =
          adjustedSupplyBasePercent > 0
            ? roundPercent(
                (
                  rawPercentage /
                  adjustedSupplyBasePercent
                ) *
                  100
              )
            : 0;

        return {
          percentage,
        };
      }
    );

  const adjustedSnapshot =
    buildSnapshot(
      adjustedHolders
    );

  const adjusted:
    EvmAdjustedHolderIntelligence = {
    ...adjustedSnapshot,

    eligibleHolderCount:
      eligible.length,

    excludedHolderCount:
      exclusions.length,

    excludedSupplyPercent,

    adjustedSupplyBasePercent,
  };

  return {
    totalHolderCount:
      data.totalCount,

    analyzedHolderCount:
      rawHolders.length,

    analyzedSupplyPercent:
      raw.analyzedSupplyPercent,

    holdersAtOrAbove1Percent:
      raw.holdersAtOrAbove1Percent,

    holdersAtOrAbove5Percent:
      raw.holdersAtOrAbove5Percent,

    concentration:
      raw.concentration,

    raw,
    adjusted,
    exclusions,
  };
}
