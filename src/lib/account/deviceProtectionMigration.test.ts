import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../../supabase/migrations/20260914123000_account_device_sessions.sql",
    import.meta.url
  );

const sql =
  readFileSync(
    migrationUrl,
    "utf8"
  );

test(
  "device session ledger is server only",
  () => {
    assert.match(
      sql,
      /revoke all[\s\S]*account_device_sessions[\s\S]*from anon, authenticated/i
    );

    assert.match(
      sql,
      /grant all[\s\S]*account_device_sessions[\s\S]*to service_role/i
    );
  }
);

test(
  "registration is serialized per account",
  () => {
    assert.match(
      sql,
      /pg_advisory_xact_lock/i
    );
  }
);

test(
  "third device revokes the oldest active device",
  () => {
    assert.match(
      sql,
      /count\(\*\)[\s\S]*>\s*2/i
    );

    assert.match(
      sql,
      /order by[\s\S]*last_seen_at asc[\s\S]*created_at asc/i
    );

    assert.match(
      sql,
      /revoke_reason\s*=\s*'device_limit'/i
    );
  }
);

test(
  "new device login creates notifications for remaining devices",
  () => {
    assert.match(
      sql,
      /account_device_notifications/i
    );

    assert.match(
      sql,
      /'new_device_login'/i
    );
  }
);

test(
  "raw IP and raw device token are not stored",
  () => {
    assert.doesNotMatch(
      sql,
      /\bip_address\b/i
    );

    assert.doesNotMatch(
      sql,
      /\bdevice_token\s+text\b/i
    );

    assert.match(
      sql,
      /\bip_hash\b/i
    );

    assert.match(
      sql,
      /\bdevice_token_hash\b/i
    );
  }
);
