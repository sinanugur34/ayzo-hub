import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const desk =
  readFileSync(
    "src/components/AppResearchDesk.tsx",
    "utf8"
  );

const page =
  readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const headerAuth =
  readFileSync(
    "src/components/auth/HeaderAuthControls.tsx",
    "utf8"
  );

const ask =
  readFileSync(
    "src/components/AskAyzoAssistantProvider.tsx",
    "utf8"
  );

const globals =
  readFileSync(
    "src/app/globals.css",
    "utf8"
  );

const login =
  readFileSync(
    "src/app/login/page.tsx",
    "utf8"
  );

const loginForm =
  readFileSync(
    "src/components/auth/LoginForm.tsx",
    "utf8"
  );

test(
  "guest header status no longer duplicates the real Sign in action",
  () => {
    assert.match(
      desk,
      /return "Guest access";/
    );

    assert.doesNotMatch(
      desk,
      /return "Sign in";/
    );

    assert.match(
      page,
      /accountControls=\{\s*<HeaderAuthControls \/>/
    );

    assert.match(
      headerAuth,
      /href="\/login\?mode=signin"/
    );

    assert.match(
      headerAuth,
      /href="\/login\?mode=signup"/
    );
  }
);

test(
  "authenticated plan labels remain intact",
  () => {
    assert.match(
      desk,
      /return "Advanced plan";/
    );

    assert.match(
      desk,
      /return "Pro plan";/
    );

    assert.match(
      desk,
      /return "Free plan";/
    );

    assert.match(
      desk,
      /return "Research access";/
    );
  }
);

test(
  "Ask AYZO dialog and trigger markers remain available",
  () => {
    assert.match(
      ask,
      /data-ayzo-ask-dialog="true"/
    );

    assert.match(
      ask,
      /data-ayzo-ask-trigger="true"/
    );
  }
);

test(
  "Ask launcher yields while its dialog is open",
  () => {
    assert.match(
      globals,
      /\[data-ayzo-ask-trigger="true"\]\[aria-expanded="true"\]/
    );

    assert.match(
      globals,
      /visibility:\s*hidden\s*!important/
    );

    assert.match(
      globals,
      /pointer-events:\s*none\s*!important/
    );
  }
);

test(
  "Ask launcher yields while Pricing and Access is expanded",
  () => {
    assert.match(
      globals,
      /body:has\(#ayzo-plans-access-trigger\[aria-expanded="true"\]\)/
    );
  }
);

test(
  "login shell uses approved AYZO research desk palette",
  () => {
    assert.match(
      login,
      /bg-\[#0b1020\]/
    );

    assert.match(
      login,
      /bg-\[#101829\]/
    );

    assert.match(
      login,
      /border-\[#2c3952\]/
    );

    assert.match(
      login,
      /text-\[#baa7ff\]/
    );
  }
);

test(
  "login form uses approved AYZO contrast tokens",
  () => {
    assert.match(
      loginForm,
      /bg-\[#151e30\]/
    );

    assert.match(
      loginForm,
      /border-\[#2c3952\]/
    );

    assert.match(
      loginForm,
      /placeholder:text-\[#7f8da8\]/
    );

    assert.match(
      loginForm,
      /focus:border-\[#baa7ff\]/
    );
  }
);

test(
  "authentication behavior contracts remain present",
  () => {
    assert.match(
      loginForm,
      /signInWithOAuth/
    );

    assert.match(
      loginForm,
      /signInWithOtp/
    );

    assert.match(
      loginForm,
      /emailRedirectTo/
    );

    assert.match(
      loginForm,
      /shouldCreateUser/
    );
  }
);
