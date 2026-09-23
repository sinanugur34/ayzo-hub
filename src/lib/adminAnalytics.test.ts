import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  isConfiguredAdminUserId,
  parseAdminUserIds,
} from "./adminAccessPolicy";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260923120000_analysis_activity_ledger.sql",
    "utf8"
  );

const store =
  fs.readFileSync(
    "src/lib/adminAnalytics.ts",
    "utf8"
  );

const ADMIN_A =
  "11111111-1111-4111-8111-111111111111";

const ADMIN_B =
  "22222222-2222-4222-8222-222222222222";

const OTHER_USER =
  "33333333-3333-4333-8333-333333333333";

test(
  "analysis ledger is server-only",
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
  "analysis ledger excludes raw sensitive analysis fields",
  () => {
    const schemaSection =
      migration.match(
        /create table public\.analysis_activity[\s\S]*?\);/
      )?.[0] ??
      "";

    for (
      const forbidden of [
        "address",
        "subject_value",
        "transaction_hash",
        "question",
        "email",
        "purchase_token",
        "order_id",
      ]
    ) {
      assert.equal(
        schemaSection
          .toLowerCase()
          .includes(
            forbidden
          ),
        false,
        `forbidden ledger column: ${forbidden}`
      );
    }
  }
);

test(
  "activity persistence fails open for product availability",
  () => {
    assert.match(
      store,
      /must never[\s\S]*interrupt/i
    );
  }
);

test(
  "admin allowlist parses only UUID user ids",
  () => {
    const parsed =
      parseAdminUserIds(
        ` ${ADMIN_A}, owner@example.com, invalid, ${ADMIN_B} `
      );

    assert.equal(
      parsed.size,
      2
    );

    assert.equal(
      parsed.has(
        ADMIN_A
      ),
      true
    );

    assert.equal(
      parsed.has(
        ADMIN_B
      ),
      true
    );

    assert.equal(
      parsed.has(
        "owner@example.com"
      ),
      false
    );
  }
);

test(
  "configured admin user id is authorized",
  () => {
    assert.equal(
      isConfiguredAdminUserId(
        ADMIN_A,
        `${ADMIN_A},${ADMIN_B}`
      ),
      true
    );
  }
);

test(
  "unlisted user id is rejected",
  () => {
    assert.equal(
      isConfiguredAdminUserId(
        OTHER_USER,
        `${ADMIN_A},${ADMIN_B}`
      ),
      false
    );
  }
);

test(
  "email can never authorize admin access",
  () => {
    assert.equal(
      isConfiguredAdminUserId(
        "owner@example.com",
        "owner@example.com"
      ),
      false
    );
  }
);

test(
  "missing admin configuration fails closed",
  () => {
    assert.equal(
      isConfiguredAdminUserId(
        ADMIN_A,
        undefined
      ),
      false
    );
  }
);

test(
  "failure codes accept only bounded machine-safe values",
  async () => {
    const {
      readAnalysisFailureCode,
    } =
      await import(
        "./adminAnalytics"
      );

    assert.equal(
      readAnalysisFailureCode({
        code:
          "UPSTREAM_ERROR",
      }),
      "UPSTREAM_ERROR"
    );

    assert.equal(
      readAnalysisFailureCode({
        code:
          "wallet 0x123 secret",
      }),
      null
    );

    assert.equal(
      readAnalysisFailureCode({
        code:
          "bad code",
      }),
      null
    );
  }
);



test(
  "web and mobile intelligence routes write operational activity",
  () => {
    const web =
      fs.readFileSync(
        "src/app/api/intelligence/route.ts",
        "utf8"
      );

    const mobile =
      fs.readFileSync(
        "src/app/api/mobile/intelligence/route.ts",
        "utf8"
      );

    assert.match(
      web,
      /platform:\s*"web"/
    );

    assert.match(
      mobile,
      /platform:\s*"android"/
    );

    assert.match(
      web,
      /recordAnalysisActivity/
    );

    assert.match(
      mobile,
      /recordAnalysisActivity/
    );
  }
);

test(
  "intelligence activity routes never pass raw address to ledger",
  () => {
    const web =
      fs.readFileSync(
        "src/app/api/intelligence/route.ts",
        "utf8"
      );

    const mobile =
      fs.readFileSync(
        "src/app/api/mobile/intelligence/route.ts",
        "utf8"
      );

    const calls =
      [
        ...web.matchAll(
          /recordAnalysisActivity\(\{([\s\S]*?)\}\);/g
        ),
        ...mobile.matchAll(
          /recordAnalysisActivity\(\{([\s\S]*?)\}\);/g
        ),
      ];

    assert.ok(
      calls.length >= 4
    );

    for (
      const match of calls
    ) {
      assert.doesNotMatch(
        match[1],
        /\baddress\b/
      );
    }
  }
);

test(
  "admin pages are protected by server authorization",
  () => {
    const layout =
      fs.readFileSync(
        "src/app/admin/layout.tsx",
        "utf8"
      );

    assert.match(
      layout,
      /getAdminAccess/
    );

    assert.match(
      layout,
      /!access\.authorized/
    );

    assert.match(
      layout,
      /notFound\(\)/
    );
  }
);

test(
  "admin pages opt out of search indexing",
  () => {
    const layout =
      fs.readFileSync(
        "src/app/admin/layout.tsx",
        "utf8"
      );

    assert.match(
      layout,
      /index:\s*false/
    );

    assert.match(
      layout,
      /follow:\s*false/
    );
  }
);

test(
  "admin user detail exposes quota and activity without raw analysis subject",
  () => {
    const page =
      fs.readFileSync(
        "src/app/admin/users/[userId]/page.tsx",
        "utf8"
      );

    assert.match(
      page,
      /quota\.remaining/
    );

    assert.match(
      page,
      /snapshot\.activity/
    );

    assert.doesNotMatch(
      page,
      /subject_value/
    );

    assert.doesNotMatch(
      page,
      /wallet_address/
    );

    assert.doesNotMatch(
      page,
      /provider_subscription_id/
    );
  }
);
