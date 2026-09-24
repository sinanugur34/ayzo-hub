import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BATCH_ANALYSIS_TARGETS,
  parseBatchAnalysisTargets,
  shouldStopBatchAfterStatus,
} from "./batchAnalysis";

test(
  "Batch Analysis accepts and deduplicates bounded targets",
  () => {
    assert.deepEqual(
      parseBatchAnalysisTargets(
        [
          "address-a",
          "address-b",
          "address-a",
        ].join("\n")
      ),
      {
        ok:
          true,

        targets: [
          "address-a",
          "address-b",
        ],
      }
    );
  }
);

test(
  "Batch Analysis rejects empty and oversized batches",
  () => {
    assert.equal(
      parseBatchAnalysisTargets(
        ""
      ).ok,
      false
    );

    const tooMany =
      Array.from(
        {
          length:
            MAX_BATCH_ANALYSIS_TARGETS +
            1,
        },
        (
          _,
          index
        ) =>
          `address-${index}`
      ).join("\n");

    assert.equal(
      parseBatchAnalysisTargets(
        tooMany
      ).ok,
      false
    );
  }
);

test(
  "Batch Analysis stops after auth quota or system-pressure responses",
  () => {
    for (
      const status of [
        401,
        403,
        429,
        503,
      ]
    ) {
      assert.equal(
        shouldStopBatchAfterStatus(
          status
        ),
        true
      );
    }

    for (
      const status of [
        200,
        400,
        404,
        500,
      ]
    ) {
      assert.equal(
        shouldStopBatchAfterStatus(
          status
        ),
        false
      );
    }
  }
);
