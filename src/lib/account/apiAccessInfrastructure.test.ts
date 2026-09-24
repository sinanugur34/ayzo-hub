import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260924232000_advanced_api_keys.sql",
    "utf8"
  );

const auth =
  fs.readFileSync(
    "src/lib/account/apiKeyAuth.ts",
    "utf8"
  );

const management =
  fs.readFileSync(
    "src/app/api/account/api-keys/route.ts",
    "utf8"
  );

const publicApi =
  fs.readFileSync(
    "src/app/api/v1/intelligence/route.ts",
    "utf8"
  );

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

test(
  "API keys are server-only hashed and limited to one active key",
  () => {
    assert.ok(
      migration.includes(
        "key_hash text not null unique"
      )
    );

    assert.ok(
      migration.includes(
        "api_keys_one_active_per_user_idx"
      )
    );

    assert.ok(
      migration.includes(
        "revoke all"
      )
    );

    assert.ok(
      migration.includes(
        "from anon, authenticated"
      )
    );
  }
);

test(
  "API authentication remains gated through the Advanced feature registry",
  () => {
    assert.ok(
      auth.includes(
        '"apiAccess"'
      )
    );

    assert.ok(
      auth.includes(
        "PLAN_REQUIRED"
      )
    );

    assert.ok(
      auth.includes(
        "planHasFeature"
      )
    );

    assert.equal(
      registry.includes(
        "apiAccess: true"
      ),
      true
    );
  }
);

test(
  "account key management never returns stored key hashes",
  () => {
    assert.ok(
      management.includes(
        "generateApiKey"
      )
    );

    assert.equal(
      management.includes(
        '"id,name,key_prefix,key_hash'
      ),
      false
    );

    assert.ok(
      management.includes(
        "ACTIVE_KEY_EXISTS"
      )
    );
  }
);

test(
  "public API keeps canonical protections and shared Advanced quota",
  () => {
    assert.ok(
      publicApi.includes(
        "authenticateApiKey"
      )
    );

    assert.ok(
      publicApi.includes(
        "consumeApiAnalysisQuota"
      )
    );

    assert.ok(
      publicApi.includes(
        "acquireAnalysisLoadGuard"
      )
    );

    assert.ok(
      publicApi.includes(
        "public-api-key:"
      )
    );

    assert.ok(
      publicApi.includes(
        'platform:\n          "api"'
      )
    );
  }
);
