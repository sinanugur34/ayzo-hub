import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql =
  fs.readFileSync(
    "supabase/migrations/20260923222000_advanced_cases_v1.sql",
    "utf8"
  );

test(
  "Cases migration enforces user ownership across case-analysis links",
  () => {
    assert.match(
      sql,
      /foreign key\(\s*case_id,\s*user_id\s*\)/i
    );

    assert.match(
      sql,
      /foreign key\(\s*saved_analysis_id,\s*user_id\s*\)/i
    );

    assert.match(
      sql,
      /enable row level security/i
    );

    assert.match(
      sql,
      /user_id = auth\.uid\(\)/i
    );
  }
);

test(
  "Every Cases RLS expression requires a live Advanced entitlement",
  () => {
    const advancedChecks =
      sql.match(
        /subscription\.plan_id\s*=\s*'advanced'/g
      ) ?? [];

    assert.equal(
      advancedChecks.length,
      8
    );

    assert.match(
      sql,
      /subscription\.status\s+in\s*\(\s*'active'\s*,\s*'canceling'\s*\)/i
    );

    assert.match(
      sql,
      /subscription\.current_period_end\s+is\s+not\s+null/i
    );

    assert.match(
      sql,
      /subscription\.current_period_end\s*>\s*now\(\)/i
    );
  }
);
