import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvancedWatchlistOverview,
  type AdvancedWatchlist,
} from "./advancedWatchlists";

test(
  "builds deterministic cross-watchlist overview",
  () => {
    const rows:
      AdvancedWatchlist[] =
      [
        {
          id:
            "one",
          name:
            "Primary",
          description:
            null,
          createdAt:
            "2026-09-24T00:00:00Z",
          updatedAt:
            "2026-09-24T00:00:00Z",
          items: [
            {
              id:
                "a",
              network:
                "bitcoin",
              subjectType:
                "wallet",
              subjectValue:
                "subject-a",
              label:
                null,
              notes:
                null,
              createdAt:
                "2026-09-24T00:00:00Z",
              updatedAt:
                "2026-09-24T00:00:00Z",
            },
            {
              id:
                "b",
              network:
                "ethereum",
              subjectType:
                "wallet",
              subjectValue:
                "subject-b",
              label:
                null,
              notes:
                null,
              createdAt:
                "2026-09-24T00:00:00Z",
              updatedAt:
                "2026-09-24T00:00:00Z",
            },
          ],
        },
        {
          id:
            "two",
          name:
            "Secondary",
          description:
            null,
          createdAt:
            "2026-09-24T00:00:00Z",
          updatedAt:
            "2026-09-24T00:00:00Z",
          items: [
            {
              id:
                "c",
              network:
                "bitcoin",
              subjectType:
                "wallet",
              subjectValue:
                "subject-a",
              label:
                "duplicate membership",
              notes:
                null,
              createdAt:
                "2026-09-24T00:00:00Z",
              updatedAt:
                "2026-09-24T00:00:00Z",
            },
          ],
        },
      ];

    const result =
      buildAdvancedWatchlistOverview(
        rows
      );

    assert.equal(
      result.totalWatchlists,
      2
    );

    assert.equal(
      result.totalItems,
      3
    );

    assert.equal(
      result.uniqueSubjects,
      2
    );

    assert.equal(
      result.duplicateMemberships,
      1
    );

    assert.deepEqual(
      result.networks,
      [
        {
          value:
            "bitcoin",
          count:
            2,
        },
        {
          value:
            "ethereum",
          count:
            1,
        },
      ]
    );
  }
);
