import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const route =
  fs.readFileSync(
    "src/app/api/account/compare-investigations/route.ts",
    "utf8"
  );

test(
  "Account exposes Compare Investigations",
  () => {
    assert.ok(
      account.includes(
        "<CompareInvestigationsPanel />"
      )
    );
  }
);

test(
  "Compare Investigations is server gated and ownership scoped",
  () => {
    assert.ok(
      route.includes(
        "canUseCompareInvestigations"
      )
    );

    assert.ok(
      route.includes(
        '.eq(\n        "user_id",'
      )
    );

    assert.ok(
      route.includes(
        '"Cache-Control":\n          "no-store"'
      )
    );
  }
);
