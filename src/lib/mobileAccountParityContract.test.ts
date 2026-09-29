import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "src/app/api/mobile/account/research/route.ts",
    "utf8"
  );

const client =
  fs.readFileSync(
    "mobile/src/mobileAccountResearch.ts",
    "utf8"
  );

const app =
  fs.readFileSync(
    "mobile/src/main.tsx",
    "utf8"
  );

test(
  "mobile research uses the registered bearer and device-token security path",
  () => {
    assert.match(
      route,
      /authenticateMobileRequest/
    );

    assert.match(
      client,
      /getMobileAuthHeaders/
    );

    assert.match(
      client,
      /\/api\/mobile\/account\/research/
    );

    assert.doesNotMatch(
      client,
      /\/api\/account\//
    );
  }
);

test(
  "mobile research account data remains scoped to the authenticated user",
  () => {
    const userScopes =
      route.match(
        /\.eq\(\s*"user_id",\s*userId\s*\)/g
      ) ?? [];

    assert.ok(
      userScopes.length >= 3
    );

    assert.match(
      route,
      /createAdminClient/
    );
  }
);

test(
  "mobile research feature visibility derives from canonical plan gates",
  () => {
    assert.match(
      route,
      /planHasFeature\(\s*planId,\s*"historicalChanges"\s*\)/
    );

    assert.match(
      route,
      /planHasFeature\(\s*planId,\s*"walletProfiler"\s*\)/
    );

    assert.match(
      route,
      /EVIDENCE_SNAPSHOT_RETENTION/
    );
  }
);

test(
  "mobile Profile exposes real account research surfaces",
  () => {
    assert.match(
      app,
      /Research Library/
    );

    assert.match(
      app,
      /Saved Analyses/
    );

    assert.match(
      app,
      /Watchlists/
    );

    assert.match(
      app,
      /Evidence History/
    );

    assert.match(
      app,
      /Profile Memory/
    );

    assert.match(
      app,
      /Smart Alerts/
    );
  }
);

test(
  "mobile app version is read from the native build instead of stale hardcoded text",
  () => {
    const nativeReads =
      app.match(
        /CapacitorApp\s*\.\s*getInfo\s*\(\s*\)/g
      ) ?? [];

    assert.ok(
      nativeReads.length >= 2
    );

    assert.match(
      app,
      /AYZO Android \{appVersion\}/
    );

    assert.doesNotMatch(
      app,
      /AYZO Android\s+\d+(?:\.\d+)*\s+·\s+Build\s+\d+/
    );

    assert.doesNotMatch(
      app,
      /1\.0 \(15\)/
    );

    assert.doesNotMatch(
      app,
      /Build 16/
    );
  }
);

test(
  "Profile navigation keeps History and Alerts actionable",
  () => {
    assert.match(
      app,
      /onOpenHistory/
    );

    assert.match(
      app,
      /onOpenAlerts/
    );

    assert.match(
      app,
      /setScreen\(\s*"research"\s*\)/
    );
  }
);
