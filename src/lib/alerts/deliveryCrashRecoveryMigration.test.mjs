import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "supabase/migrations/20260907160000_alert_delivery_crash_recovery.sql";

const sql =
  fs.readFileSync(
    path,
    "utf8"
  );


test(
  "crash recovery replaces the server claim function",
  () => {
    assert.match(
      sql,
      /create or replace function\s+public\.ayzo_claim_alert_deliveries/i
    );
  }
);


test(
  "fresh processing deliveries are protected by a stale threshold",
  () => {
    assert.match(
      sql,
      /claimed_at\s*<=\s*now\(\)\s*-\s*interval\s*'1 hour'/i
    );
  }
);


test(
  "stale processing deliveries are reclaimable only inside the bounded window",
  () => {
    assert.match(
      sql,
      /status\s*=\s*'processing'[\s\S]*claimed_at\s*>\s*now\(\)\s*-\s*interval\s*'20 hours'/i
    );

    assert.match(
      sql,
      /attempt_count\s*<\s*delivery\.max_attempts/i
    );
  }
);


test(
  "processing deliveries outside the safe idempotency window are terminalized",
  () => {
    assert.match(
      sql,
      /DELIVERY_STALE_IDEMPOTENCY_WINDOW_EXPIRED/
    );

    assert.match(
      sql,
      /next_attempt_at\s*=\s*null/i
    );
  }
);


test(
  "stale processing deliveries with exhausted attempts are terminalized",
  () => {
    assert.match(
      sql,
      /DELIVERY_STALE_ATTEMPTS_EXHAUSTED/
    );

    assert.match(
      sql,
      /attempt_count\s*>=\s*max_attempts/i
    );
  }
);


test(
  "reclaim increments the delivery attempt budget",
  () => {
    assert.match(
      sql,
      /attempt_count\s*=\s*delivery\.attempt_count\s*\+\s*1/i
    );
  }
);


test(
  "claim remains concurrency safe",
  () => {
    assert.match(
      sql,
      /for update\s+skip locked/i
    );

    assert.match(
      sql,
      /claim_token\s*=\s*p_claim_token/i
    );
  }
);


test(
  "claim remains service-role only",
  () => {
    assert.match(
      sql,
      /revoke all[\s\S]*from authenticated/i
    );

    assert.match(
      sql,
      /grant execute[\s\S]*to service_role/i
    );
  }
);
