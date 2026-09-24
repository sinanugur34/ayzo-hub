import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const customRoute =
  fs.readFileSync(
    "src/app/api/account/custom-alert-rules/route.ts",
    "utf8"
  );

const basicRoute =
  fs.readFileSync(
    "src/app/api/account/alert-rules/route.ts",
    "utf8"
  );

const evaluationBatch =
  fs.readFileSync(
    "src/lib/alerts/evaluationBatch.ts",
    "utf8"
  );

test(
  "Account exposes Advanced Custom Alert Rules",
  () => {
    assert.ok(
      account.includes(
        "<CustomAlertRulesPanel />"
      )
    );
  }
);

test(
  "Custom Alert Rules is Advanced gated and ownership scoped",
  () => {
    assert.ok(
      customRoute.includes(
        "canUseCustomAlertRules"
      )
    );

    assert.ok(
      customRoute.includes(
        '.eq(\n        "user_id",'
      )
    );

    assert.ok(
      customRoute.includes(
        '"Cache-Control":\n          "no-store"'
      )
    );
  }
);

test(
  "basic alert management inherits through plan feature registry",
  () => {
    assert.ok(
      basicRoute.includes(
        'planHasFeature('
      )
    );

    assert.ok(
      basicRoute.includes(
        '"alerts"'
      )
    );
  }
);

test(
  "scheduled monitoring includes Pro and Advanced subscriptions",
  () => {
    assert.ok(
      evaluationBatch.includes(
        '"advanced"'
      )
    );

    assert.ok(
      evaluationBatch.includes(
        '"pro"'
      )
    );
  }
);
