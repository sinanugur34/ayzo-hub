import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260908235500_welcome_email_delivery.sql",
    "utf8"
  );

test(
  "welcome migration is new-user triggered and unique per user",
  () => {
    assert.match(
      migration,
      /user_id uuid not null unique/i
    );

    assert.match(
      migration,
      /after insert\s+on auth\.users/i
    );

    assert.match(
      migration,
      /on conflict \(user_id\) do nothing/i
    );
  }
);

test(
  "welcome ledger is not browser-accessible",
  () => {
    assert.match(
      migration,
      /enable row level security/i
    );

    assert.match(
      migration,
      /revoke all[\s\S]*from anon, authenticated/i
    );
  }
);

test(
  "claim function uses processing ownership",
  () => {
    assert.match(
      migration,
      /ayzo_claim_welcome_email/i
    );

    assert.match(
      migration,
      /status = 'processing'/i
    );

    assert.match(
      migration,
      /claim_token/i
    );
  }
);
