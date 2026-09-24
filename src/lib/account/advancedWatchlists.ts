export type AdvancedWatchlistItem = {
  id: string;
  network: string;
  subjectType: string;
  subjectValue: string;
  label: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdvancedWatchlist = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  items: AdvancedWatchlistItem[];
};

type CountEntry = {
  value: string;
  count: number;
};

function sortCounts(
  counts: Map<
    string,
    number
  >
): CountEntry[] {
  return Array.from(
    counts.entries()
  )
    .map(
      ([value, count]) => ({
        value,
        count,
      })
    )
    .sort(
      (left, right) =>
        right.count -
          left.count ||
        left.value.localeCompare(
          right.value
        )
    );
}

export function buildAdvancedWatchlistOverview(
  watchlists:
    AdvancedWatchlist[]
) {
  const subjects =
    new Set<string>();

  const networkCounts =
    new Map<
      string,
      number
    >();

  const subjectTypeCounts =
    new Map<
      string,
      number
    >();

  let totalItems =
    0;

  for (
    const watchlist
    of watchlists
  ) {
    for (
      const item
      of watchlist.items
    ) {
      totalItems +=
        1;

      const subjectKey =
        [
          item.network
            .trim()
            .toLowerCase(),

          item.subjectType
            .trim()
            .toLowerCase(),

          item.subjectValue
            .trim()
            .toLowerCase(),
        ].join(
          "\u0000"
        );

      subjects.add(
        subjectKey
      );

      networkCounts.set(
        item.network,
        (
          networkCounts.get(
            item.network
          ) ?? 0
        ) + 1
      );

      subjectTypeCounts.set(
        item.subjectType,
        (
          subjectTypeCounts.get(
            item.subjectType
          ) ?? 0
        ) + 1
      );
    }
  }

  return {
    totalWatchlists:
      watchlists.length,

    totalItems,

    uniqueSubjects:
      subjects.size,

    duplicateMemberships:
      Math.max(
        0,
        totalItems -
          subjects.size
      ),

    networks:
      sortCounts(
        networkCounts
      ),

    subjectTypes:
      sortCounts(
        subjectTypeCounts
      ),
  };
}
