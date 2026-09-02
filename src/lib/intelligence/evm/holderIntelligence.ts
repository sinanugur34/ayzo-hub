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

export type EvmHolderIntelligence = {
  totalHolderCount: number | null;
  analyzedHolderCount: number;
  analyzedSupplyPercent: number;
  holdersAtOrAbove1Percent: number;
  holdersAtOrAbove5Percent: number;
  concentration: EvmHolderConcentration;
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

function sumTop(
  holders: readonly EvmTokenHolder[],
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

  return Number(
    total.toFixed(4)
  );
}

export function analyzeEvmTokenHolders(
  data: EvmTokenHolders
): EvmHolderIntelligence {
  const holders = [
    ...data.holders,
  ].sort(
    (a, b) =>
      normalizePercent(
        b.percentage
      ) -
      normalizePercent(
        a.percentage
      )
  );

  const analyzedSupplyPercent =
    sumTop(
      holders,
      holders.length
    );

  return {
    totalHolderCount:
      data.totalCount,

    analyzedHolderCount:
      holders.length,

    analyzedSupplyPercent,

    holdersAtOrAbove1Percent:
      holders.filter(
        holder =>
          normalizePercent(
            holder.percentage
          ) >= 1
      ).length,

    holdersAtOrAbove5Percent:
      holders.filter(
        holder =>
          normalizePercent(
            holder.percentage
          ) >= 5
      ).length,

    concentration: {
      top1Percent:
        sumTop(holders, 1),

      top5Percent:
        sumTop(holders, 5),

      top10Percent:
        sumTop(holders, 10),

      top20Percent:
        sumTop(holders, 20),

      top50Percent:
        sumTop(holders, 50),

      top100Percent:
        sumTop(holders, 100),
    },
  };
}
