import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const apiMigration =
  fs.readFileSync(
    "supabase/migrations/20260924232000_advanced_api_keys.sql",
    "utf8"
  );

const analytics =
  fs.readFileSync(
    "src/lib/adminAnalytics.ts",
    "utf8"
  );

const read =
  fs.readFileSync(
    "src/lib/adminAnalyticsRead.ts",
    "utf8"
  );

const page =
  fs.readFileSync(
    "src/app/admin/page.tsx",
    "utf8"
  );

const apiRoute =
  fs.readFileSync(
    "src/app/api/v1/intelligence/route.ts",
    "utf8"
  );

test(
  "existing API migration already allows every canonical activity platform",
  () => {
    assert.match(
      apiMigration,
      /analysis_activity_platform_check/
    );

    for (
      const platform of [
        "web",
        "android",
        "ios",
        "api",
      ]
    ) {
      assert.match(
        apiMigration,
        new RegExp(
          `'${platform}'`
        )
      );

      assert.match(
        analytics,
        new RegExp(
          `\\| "${platform}"`
        )
      );
    }
  }
);

test(
  "public API activity uses the existing canonical API platform",
  () => {
    assert.match(
      apiRoute,
      /platform:\s*"api"/
    );

    assert.match(
      apiMigration,
      /'api'/
    );
  }
);

test(
  "Admin activity snapshot counts every canonical platform",
  () => {
    for (
      const field of [
        "web7d",
        "android7d",
        "ios7d",
        "api7d",
      ]
    ) {
      assert.match(
        read,
        new RegExp(
          field
        )
      );
    }

    for (
      const platform of [
        "web",
        "android",
        "ios",
        "api",
      ]
    ) {
      assert.match(
        read,
        new RegExp(
          `platform:\\s*\\n\\s*"${platform}"`
        )
      );
    }
  }
);

test(
  "Admin Analysis Activity exposes all four platform cards",
  () => {
    for (
      const label of [
        "Web",
        "Android",
        "iOS",
        "API",
      ]
    ) {
      assert.match(
        page,
        new RegExp(
          `label="${label}"`
        )
      );
    }
  }
);

test(
  "existing API activity migration does not add sensitive analysis fields",
  () => {
    const activitySection =
      apiMigration.match(
        /alter table public\.analysis_activity[\s\S]*?comment on table public\.api_keys/
      )?.[0] ??
      "";

    for (
      const forbidden of [
        "wallet_address",
        "transaction_hash",
        "question_text",
        "purchase_token",
      ]
    ) {
      assert.equal(
        activitySection
          .toLowerCase()
          .includes(
            forbidden
          ),
        false
      );
    }
  }
);
