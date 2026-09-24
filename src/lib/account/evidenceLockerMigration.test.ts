import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql =
  fs.readFileSync(
    "supabase/migrations/20260924203000_advanced_evidence_locker_v1.sql",
    "utf8"
  );

test(
  "Evidence Locker migration creates immutable Advanced-only storage",
  () => {
    assert.match(
      sql,
      /create table public\.evidence_locker_items/i
    );

    assert.match(
      sql,
      /snapshot jsonb not null/i
    );

    assert.match(
      sql,
      /snapshot_sha256 text not null/i
    );

    assert.match(
      sql,
      /enable row level security/i
    );

    assert.match(
      sql,
      /subscription\.plan_id\s*=\s*'advanced'/i
    );

    assert.doesNotMatch(
      sql,
      /grant[\s\S]*update[\s\S]*evidence_locker_items/i
    );
  }
);
