import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260929213000_admin_authenticated_attribution.sql",
    "utf8"
  );

const reader =
  fs.readFileSync(
    "src/lib/adminAttribution.ts",
    "utf8"
  );

const page =
  fs.readFileSync(
    "src/app/admin/page.tsx",
    "utf8"
  );

test(
  "authenticated attribution RPC returns aggregates without raw identity fields",
  () => {
    assert.match(
      migration,
      /ayzo_admin_authenticated_attribution/
    );

    assert.match(
      migration,
      /count\(\*\)::bigint/
    );

    assert.match(
      migration,
      /pe\.user_id is not null/
    );

    assert.match(
      migration,
      /left join public\.user_signup_source/
    );

    assert.doesNotMatch(
      migration,
      /returns table[\s\S]*email/i
    );

    assert.doesNotMatch(
      migration,
      /returns table[\s\S]*user_id\s+uuid/i
    );
  }
);

test(
  "attribution RPC remains service-role only and invoker-rights",
  () => {
    assert.match(
      migration,
      /security invoker/i
    );

    assert.doesNotMatch(
      migration,
      /security definer/i
    );

    assert.match(
      migration,
      /revoke all[\s\S]*public, anon, authenticated/i
    );

    assert.match(
      migration,
      /grant execute[\s\S]*service_role/i
    );
  }
);

test(
  "Admin attribution fails soft when migration is unavailable",
  () => {
    assert.match(
      reader,
      /available:\s*false/
    );

    assert.match(
      reader,
      /ayzo_admin_authenticated_attribution/
    );
  }
);

test(
  "Admin UI states attribution population limits",
  () => {
    assert.match(
      page,
      /AUTHENTICATED ATTRIBUTION · 7 DAYS/
    );

    assert.match(
      page,
      /Authenticated product-event users only/
    );

    assert.match(
      page,
      /Anonymous consented sessions are intentionally excluded/
    );

    assert.match(
      page,
      /Attribution coverage/
    );
  }
);
