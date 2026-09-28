import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const auth =
  fs.readFileSync(
    "mobile/src/mobileAuth.ts",
    "utf8"
  );

const app =
  fs.readFileSync(
    "mobile/src/main.tsx",
    "utf8"
  );

test(
  "Google Play review access uses standard Supabase password auth",
  () => {
    assert.match(
      auth,
      /signInWithReviewCredentials/
    );

    assert.match(
      auth,
      /signInWithPassword/
    );

    assert.doesNotMatch(
      auth,
      /service_role|SUPABASE_SERVICE_ROLE/i
    );
  }
);

test(
  "review access remains separate from standard magic-link auth",
  () => {
    assert.match(
      auth,
      /sendEmailOtp/
    );

    assert.match(
      auth,
      /signInWithOtp/
    );

    assert.match(
      app,
      /App review access/
    );

    assert.match(
      app,
      /Google Play review sign in/
    );

    assert.match(
      app,
      /registerMobileSession/
    );
  }
);

test(
  "review credentials are not hardcoded into the mobile client",
  () => {
    assert.doesNotMatch(
      auth,
      /play-review@|google-review@|reviewer@ayzo/i
    );

    assert.doesNotMatch(
      app,
      /play-review@|google-review@|reviewer@ayzo/i
    );

    assert.doesNotMatch(
      app,
      /reviewPassword\\s*=\\s*["'][^"']+["']/
    );
  }
);


test(
  "review access supports password visibility and safe navigation",
  () => {
    assert.match(
      app,
      /Show password/
    );

    assert.match(
      app,
      /Hide password/
    );

    assert.match(
      app,
      /reviewPasswordVisible/
    );

    assert.match(
      app,
      /"backButton"/
    );

    assert.match(
      app,
      /Back to Google or email sign in/
    );

    assert.match(
      app,
      /setScreen\("signin"\)/
    );
  }
);


test(
  "review password device registration is restricted to server-marked reviewer accounts",
  () => {
    const mobileSessionAuth =
      fs.readFileSync(
        "src/lib/account/mobileSessionAuth.ts",
        "utf8"
      );

    const mobileSessionAuthCore =
      fs.readFileSync(
        "src/lib/account/mobileSessionAuthCore.ts",
        "utf8"
      );

    assert.match(
      mobileSessionAuth,
      /isGooglePlayReviewAccountMetadata\(\s*user\.app_metadata\s*\)\s*&&\s*isFreshReviewPasswordAuthenticationToken\(\s*accessToken\s*\)/s
    );

    assert.match(
      mobileSessionAuthCore,
      /ayzo_account_type\s*===\s*"google_play_review"/
    );

    assert.match(
      mobileSessionAuthCore,
      /record\.method\s*!==\s*"password"/
    );

    assert.doesNotMatch(
      mobileSessionAuthCore,
      /ALLOWED_FRESH_AUTH_METHODS[\s\S]{0,160}"password"/
    );
  }
);
