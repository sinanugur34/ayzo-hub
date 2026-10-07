import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20261002020000_provider_usage_telemetry_v1.sql";

test(
  "provider usage ledger is server-only and RLS protected",
  () => {
    const sql =
      fs.readFileSync(
        MIGRATION,
        "utf8"
      );

    assert.ok(
      sql.includes(
        "create table if not exists public.provider_usage_events"
      )
    );

    assert.ok(
      sql.includes(
        "enable row level security"
      )
    );

    assert.ok(
      sql.includes(
        "force row level security"
      )
    );

    assert.ok(
      sql.includes(
        "revoke all"
      )
    );

    assert.ok(
      sql.includes(
        "from authenticated"
      )
    );

    assert.ok(
      sql.includes(
        "to service_role"
      )
    );
  }
);

test(
  "provider usage ledger does not store analyzed subject or credentials",
  () => {
    const sql =
      fs.readFileSync(
        MIGRATION,
        "utf8"
      )
        .toLowerCase();

    const createTable =
      sql.slice(
        sql.indexOf(
          "create table"
        ),
        sql.indexOf(
          "comment on table"
        )
      );

    for (
      const forbidden of [
        "address ",
        "wallet ",
        "token_address",
        "subject_value",
        "api_key",
        "authorization",
        "request_body",
        "raw_response",
      ]
    ) {
      assert.equal(
        createTable.includes(
          forbidden
        ),
        false,
        forbidden
      );
    }
  }
);
