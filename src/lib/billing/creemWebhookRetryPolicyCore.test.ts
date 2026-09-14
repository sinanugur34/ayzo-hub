import test from "node:test";
import assert from "node:assert/strict";

import {
  CREEM_WEBHOOK_STALE_PROCESSING_MS,
  creemWebhookStaleCutoffIso,
  shouldTreatCreemWebhookAsDuplicate,
} from "./creemWebhookRetryPolicyCore";

const NOW = Date.parse("2026-09-14T20:00:00.000Z");

test("processed and ignored events are terminal duplicates", () => {
  for (const status of ["processed", "ignored"] as const) {
    assert.equal(
      shouldTreatCreemWebhookAsDuplicate({
        status,
        processingStartedAt: null,
        nowMs: NOW,
      }),
      true,
    );
  }
});

test("received and failed events remain retryable", () => {
  for (const status of ["received", "failed"] as const) {
    assert.equal(
      shouldTreatCreemWebhookAsDuplicate({
        status,
        processingStartedAt: null,
        nowMs: NOW,
      }),
      false,
    );
  }
});

test("fresh processing event is treated as an in-flight duplicate", () => {
  assert.equal(
    shouldTreatCreemWebhookAsDuplicate({
      status: "processing",

      processingStartedAt: new Date(NOW - 60_000).toISOString(),

      nowMs: NOW,
    }),
    true,
  );
});

test("stale processing event is reclaimable", () => {
  assert.equal(
    shouldTreatCreemWebhookAsDuplicate({
      status: "processing",

      processingStartedAt: new Date(
        NOW - CREEM_WEBHOOK_STALE_PROCESSING_MS - 1,
      ).toISOString(),

      nowMs: NOW,
    }),
    false,
  );
});

test("missing processing timestamp fails open to recovery", () => {
  assert.equal(
    shouldTreatCreemWebhookAsDuplicate({
      status: "processing",

      processingStartedAt: null,

      nowMs: NOW,
    }),
    false,
  );
});

test("stale cutoff is deterministic", () => {
  assert.equal(
    creemWebhookStaleCutoffIso(NOW),
    new Date(NOW - CREEM_WEBHOOK_STALE_PROCESSING_MS).toISOString(),
  );
});
