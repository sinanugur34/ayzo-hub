import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS,
  googlePlayRtdnStaleCutoffIso,
  shouldTreatGooglePlayRtdnAsDuplicate,
} from "./googlePlayRtdnRetryPolicyCore";

const NOW =
  Date.parse(
    "2026-09-22T20:00:00.000Z"
  );

test(
  "processed and ignored RTDN events are terminal duplicates",
  () => {
    for (
      const status of [
        "processed",
        "ignored",
      ] as const
    ) {
      assert.equal(
        shouldTreatGooglePlayRtdnAsDuplicate({
          status,
          processingStartedAt:
            null,
          nowMs:
            NOW,
        }),
        true
      );
    }
  }
);

test(
  "received and failed RTDN events remain retryable",
  () => {
    for (
      const status of [
        "received",
        "failed",
      ] as const
    ) {
      assert.equal(
        shouldTreatGooglePlayRtdnAsDuplicate({
          status,
          processingStartedAt:
            null,
          nowMs:
            NOW,
        }),
        false
      );
    }
  }
);

test(
  "fresh RTDN processing claim is treated as duplicate",
  () => {
    assert.equal(
      shouldTreatGooglePlayRtdnAsDuplicate({
        status:
          "processing",

        processingStartedAt:
          new Date(
            NOW - 60_000
          ).toISOString(),

        nowMs:
          NOW,
      }),
      true
    );
  }
);

test(
  "stale RTDN processing claim is retryable",
  () => {
    assert.equal(
      shouldTreatGooglePlayRtdnAsDuplicate({
        status:
          "processing",

        processingStartedAt:
          new Date(
            NOW -
              GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS -
              1
          ).toISOString(),

        nowMs:
          NOW,
      }),
      false
    );
  }
);

test(
  "RTDN stale cutoff is deterministic",
  () => {
    assert.equal(
      googlePlayRtdnStaleCutoffIso(
        NOW
      ),
      new Date(
        NOW -
          GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS
      ).toISOString()
    );
  }
);
