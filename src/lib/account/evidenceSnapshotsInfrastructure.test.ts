import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260927174208_evidence_snapshots_v11.sql",
    "utf8"
  );

const route =
  fs.readFileSync(
    "src/app/api/account/historical-changes/route.ts",
    "utf8"
  );

test(
  "automatic Evidence History is RLS protected",
  () => {
    assert.match(
      migration,
      /enable row level security/i
    );

    assert.match(
      migration,
      /evidence_snapshots_select_paid_own/
    );

    assert.match(
      migration,
      /user_id = auth\.uid\(\)/
    );
  }
);

test(
  "authenticated clients receive read-only Evidence History access",
  () => {
    assert.match(
      migration,
      /grant select\s+on table public\.evidence_snapshots\s+to authenticated;/i
    );

    assert.match(
      migration,
      /grant\s+select,\s+insert,\s+delete\s+on table public\.evidence_snapshots\s+to service_role;/i
    );
  }
);

test(
  "automatic baselines are paid-plan gated",
  () => {
    assert.match(
      migration,
      /'pro'/
    );

    assert.match(
      migration,
      /'advanced'/
    );

    assert.match(
      route,
      /planHasFeature\([\s\S]*"historicalChanges"/
    );
  }
);

test(
  "manual Saved Analyses remain baseline fallback",
  () => {
    assert.match(
      route,
      /"evidence_snapshots"/
    );

    assert.match(
      route,
      /"saved_analyses"/
    );

    assert.match(
      route,
      /source:[\s\S]*"automatic"/
    );

    assert.match(
      route,
      /source:[\s\S]*"saved"/
    );
  }
);

test(
  "automatic mutation uses server-admin storage and server time",
  () => {
    assert.match(
      route,
      /createAdminClient/
    );

    assert.match(
      route,
      /serverCapturedSnapshot/
    );
  }
);

test(
  "Investigation Timeline consumes automatic evidence memory",
  () => {
    const route =
      fs.readFileSync(
        "src/app/api/account/investigation-timeline/route.ts",
        "utf8"
      );

    const panel =
      fs.readFileSync(
        "src/components/InvestigationTimelinePanel.tsx",
        "utf8"
      );

    assert.match(
      route,
      /"evidence_snapshots"/
    );

    assert.match(
      route,
      /"automatic_baseline"/
    );

    assert.match(
      panel,
      /Automatic baseline/
    );

    assert.match(
      panel,
      /HISTORY POINT/
    );
  }
);
