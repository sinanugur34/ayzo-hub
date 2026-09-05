import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "supabase/migrations/20260906010000_alert_delivery_ledger.sql";

const sql =
  fs.readFileSync(
    path,
    "utf8"
  );

test(
  "delivery ledger table exists",
  () => {
    assert.match(
      sql,
      /create table\s+public\.alert_deliveries/i
    );
  }
);

test(
  "event and channel are idempotent",
  () => {
    assert.match(
      sql,
      /unique\s*\(\s*alert_event_id,\s*delivery_channel\s*\)/i
    );
  }
);

test(
  "event insert queues delivery",
  () => {
    assert.match(
      sql,
      /after insert\s+on public\.alert_events/i
    );

    assert.match(
      sql,
      /ayzo_enqueue_alert_delivery/i
    );
  }
);

test(
  "claim uses skip locked",
  () => {
    assert.match(
      sql,
      /for update\s+skip locked/i
    );
  }
);

test(
  "claim function is server only",
  () => {
    assert.match(
      sql,
      /grant execute[\s\S]*to service_role/i
    );

    assert.match(
      sql,
      /revoke all[\s\S]*from authenticated/i
    );
  }
);

test(
  "browser delivery table access is closed",
  () => {
    assert.match(
      sql,
      /enable row level security/i
    );

    assert.match(
      sql,
      /revoke all[\s\S]*public\.alert_deliveries[\s\S]*from authenticated/i
    );
  }
);

test(
  "historical delivery backfill is absent",
  () => {
    assert.doesNotMatch(
      sql,
      /insert into\s+public\.alert_deliveries[\s\S]*from\s+public\.alert_events\s+as/i
    );
  }
);
