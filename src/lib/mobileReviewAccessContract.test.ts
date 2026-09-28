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
