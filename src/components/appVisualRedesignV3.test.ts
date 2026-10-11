import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const analytics =
  fs.readFileSync(
    "src/components/GoogleAnalytics.tsx",
    "utf8"
  );

const ask =
  fs.readFileSync(
    "src/components/AskAyzoAssistantProvider.tsx",
    "utf8"
  );

const status =
  fs.readFileSync(
    "src/components/FreePlanStatus.tsx",
    "utf8"
  );

const css =
  fs.readFileSync(
    "src/app/globals.css",
    "utf8"
  );

const page =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const desk =
  fs.readFileSync(
    "src/components/AppResearchDesk.tsx",
    "utf8"
  );

test(
  "analytics consent exposes a scoped visual coordination marker",
  () => {
    assert.match(
      analytics,
      /data-ayzo-analytics-consent="true"/
    );
  }
);

test(
  "Ask AYZO trigger and dialog expose scoped coordination markers",
  () => {
    assert.match(
      ask,
      /data-ayzo-ask-trigger="true"/
    );

    assert.match(
      ask,
      /data-ayzo-ask-dialog="true"/
    );
  }
);

test(
  "consent owns the bottom interaction zone while unresolved",
  () => {
    assert.match(
      css,
      /body:has\([\s\S]*data-ayzo-analytics-consent/
    );

    assert.match(
      css,
      /pointer-events:\s*none/
    );

    assert.match(
      css,
      /visibility:\s*hidden/
    );
  }
);

test(
  "mobile consent surface keeps safe-area and touch target protection",
  () => {
    assert.match(
      css,
      /env\(safe-area-inset-bottom\)/
    );

    assert.match(
      css,
      /min-height:\s*44px/
    );

    assert.match(
      css,
      /@media \(max-width: 370px\)/
    );
  }
);

test(
  "public address placeholder is short enough for narrow mobile widths",
  () => {
    const surfaces =
      page +
      "\n" +
      desk;

    assert.match(
      surfaces,
      /Paste wallet or token address/
    );

    assert.doesNotMatch(
      surfaces,
      /Paste a wallet or token contract address/
    );
  }
);

test(
  "analysis access loading failure no longer stays permanently ambiguous",
  () => {
    assert.match(
      status,
      /loadFailed/
    );

    assert.match(
      status,
      /data-ayzo-access-state/
    );

    assert.match(
      status,
      /temporarily unavailable\. You can still try an analysis\./
    );

    assert.match(
      status,
      /Checking analysis access…/
    );
  }
);

test(
  "canonical Free and paid network quota disclosures survive V3C",
  () => {
    assert.match(
      status,
      /same-network analyses remaining/
    );

    assert.match(
      status,
      /No per-network analysis limit/
    );

    assert.match(
      status,
      /Create Free Account/
    );
  }
);

test(
  "V3C keeps reduced-motion protection",
  () => {
    assert.match(
      css,
      /prefers-reduced-motion/
    );

    assert.match(
      css,
      /transition:\s*none !important/
    );
  }
);
