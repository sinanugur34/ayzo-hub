import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateAlertObservation,
  hashAlertDetectionSnapshot,
} from "./detection.ts";

function evidence(
  category,
  reference,
  occurredAt =
    "2026-09-04T20:00:00.000Z"
) {
  return {
    category,
    reference,
    network:
      "ethereum",
    occurredAt,
    evidenceState:
      "SUPPORTED",
  };
}

function observation(
  refs
) {
  return {
    observedAt:
      "2026-09-04T21:00:00.000Z",
    evidence:
      refs,
  };
}

test(
  "first observation establishes baseline without alert",
  () => {
    const result =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    assert.equal(
      result.outcome,
      "baseline"
    );

    assert.equal(
      result.event,
      null
    );
  }
);

test(
  "identical evidence creates no event",
  () => {
    const baseline =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    const next =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          baseline.snapshot,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    assert.equal(
      next.outcome,
      "no_change"
    );

    assert.equal(
      next.event,
      null
    );
  }
);

test(
  "new supported activity creates one candidate event",
  () => {
    const baseline =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    const next =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          baseline.snapshot,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),

            evidence(
              "activity",
              "tx-2"
            ),
          ]),
      });

    assert.equal(
      next.outcome,
      "changed"
    );

    assert.ok(
      next.event
    );

    assert.equal(
      next.event
        .evidenceState,
      "SUPPORTED"
    );

    assert.equal(
      next.event
        .evidenceRefs
        .length,
      1
    );

    assert.equal(
      next.event
        .evidenceRefs[0]
        .reference,
      "tx-2"
    );
  }
);

test(
  "irrelevant evidence category does not trigger rule",
  () => {
    const baseline =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    const next =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          baseline.snapshot,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),

            evidence(
              "funding",
              "funding-1"
            ),
          ]),
      });

    assert.equal(
      next.event,
      null
    );

    assert.equal(
      next.stateHash,
      baseline.stateHash
    );
  }
);

test(
  "state hash is evidence-order independent",
  () => {
    const left =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-1"
            ),

            evidence(
              "activity",
              "tx-2"
            ),
          ]),
      });

    const right =
      evaluateAlertObservation({
        ruleType:
          "new_activity",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "activity",
              "tx-2"
            ),

            evidence(
              "activity",
              "tx-1"
            ),
          ]),
      });

    assert.equal(
      left.stateHash,
      right.stateHash
    );

    assert.equal(
      hashAlertDetectionSnapshot(
        left.snapshot
      ),
      hashAlertDetectionSnapshot(
        right.snapshot
      )
    );
  }
);

test(
  "same evidence replay produces same deterministic event key",
  () => {
    const empty =
      evaluateAlertObservation({
        ruleType:
          "funding_movement",

        previousSnapshot:
          null,

        observation:
          observation([]),
      });

    const first =
      evaluateAlertObservation({
        ruleType:
          "funding_movement",

        previousSnapshot:
          empty.snapshot,

        observation:
          observation([
            evidence(
              "funding",
              "source-tx-1"
            ),
          ]),
      });

    const second =
      evaluateAlertObservation({
        ruleType:
          "funding_movement",

        previousSnapshot:
          empty.snapshot,

        observation:
          observation([
            evidence(
              "funding",
              "source-tx-1"
            ),
          ]),
      });

    assert.ok(
      first.event
    );

    assert.ok(
      second.event
    );

    assert.equal(
      first.event
        .eventKey,
      second.event
        .eventKey
    );
  }
);

test(
  "losing bounded historical evidence does not alert",
  () => {
    const baseline =
      evaluateAlertObservation({
        ruleType:
          "relationship_change",

        previousSnapshot:
          null,

        observation:
          observation([
            evidence(
              "relationship",
              "edge-1"
            ),

            evidence(
              "relationship",
              "edge-2"
            ),
          ]),
      });

    const next =
      evaluateAlertObservation({
        ruleType:
          "relationship_change",

        previousSnapshot:
          baseline.snapshot,

        observation:
          observation([
            evidence(
              "relationship",
              "edge-2"
            ),
          ]),
      });

    assert.equal(
      next.event,
      null
    );
  }
);

test(
  "unsupported evidence state is rejected",
  () => {
    assert.throws(
      () =>
        evaluateAlertObservation({
          ruleType:
            "new_activity",

          previousSnapshot:
            null,

          observation: {
            observedAt:
              "2026-09-04T21:00:00.000Z",

            evidence: [
              {
                category:
                  "activity",

                reference:
                  "tx-1",

                network:
                  "ethereum",

                occurredAt:
                  null,

                evidenceState:
                  "INFERRED",
              },
            ],
          },
        }),
      /SUPPORTED evidence only/
    );
  }
);
