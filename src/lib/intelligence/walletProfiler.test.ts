import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWalletProfile,
} from "./walletProfiler";

import type {
  WalletTrackRecord,
} from "./walletTrackRecord";

function record():
  WalletTrackRecord {
  return {
    status:
      "limited",

    firstObservedAt:
      "2026-09-01T00:00:00.000Z",

    lastObservedAt:
      "2026-09-27T00:00:00.000Z",

    observedSpanDays:
      26,

    metrics: [
      {
        id:
          "observed-transactions",

        label:
          "Observed transactions",

        value:
          "12",

        detail:
          null,

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "incoming-events",

        label:
          "Incoming activity",

        value:
          "4",

        detail:
          null,

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "funding-sources",

        label:
          "Funding sources",

        value:
          "3",

        detail:
          null,

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "counterparties",

        label:
          "Counterparties",

        value:
          "7",

        detail:
          null,

        evidenceState:
          "SUPPORTED",
      },

      {
        id:
          "interactions",

        label:
          "Interactions",

        value:
          "9",

        detail:
          null,

        evidenceState:
          "SUPPORTED",
      },
    ],

    limitation:
      "Bounded evidence only.",

    methodology:
      "Observed evidence only.",

    evidenceState:
      "SUPPORTED",
  };
}

test(
  "Wallet Profiler groups existing evidence without creating new claims",
  () => {
    const profile =
      buildWalletProfile(
        record()
      );

    assert.equal(
      profile.version,
      1
    );

    assert.equal(
      profile.evidenceMetricCount,
      5
    );

    const activity =
      profile.sections.find(
        section =>
          section.id ===
          "activity"
      );

    const funding =
      profile.sections.find(
        section =>
          section.id ===
          "funding"
      );

    const relationships =
      profile.sections.find(
        section =>
          section.id ===
          "relationships"
      );

    assert.deepEqual(
      activity?.metrics.map(
        metric =>
          metric.id
      ),
      [
        "observed-transactions",
        "incoming-events",
      ]
    );

    assert.deepEqual(
      funding?.metrics.map(
        metric =>
          metric.id
      ),
      [
        "funding-sources",
      ]
    );

    assert.deepEqual(
      relationships?.metrics.map(
        metric =>
          metric.id
      ),
      [
        "counterparties",
        "interactions",
      ]
    );
  }
);

test(
  "Wallet Profiler preserves the evidence window",
  () => {
    const profile =
      buildWalletProfile(
        record()
      );

    assert.equal(
      profile.firstObservedAt,
      "2026-09-01T00:00:00.000Z"
    );

    assert.equal(
      profile.lastObservedAt,
      "2026-09-27T00:00:00.000Z"
    );

    assert.equal(
      profile.observedSpanDays,
      26
    );
  }
);

test(
  "Wallet Profiler has no score field",
  () => {
    const profile =
      buildWalletProfile(
        record()
      );

    assert.equal(
      "score" in profile,
      false
    );

    assert.match(
      profile.methodology,
      /does not create a risk score/
    );

    assert.match(
      profile.methodology,
      /identity claim/
    );

    assert.match(
      profile.methodology,
      /ownership claim/
    );
  }
);
