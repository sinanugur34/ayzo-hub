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
    "src/app/api/account/batch-analysis/route.ts",
    "utf8"
  );

const panel =
  fs.readFileSync(
    "src/components/account/BatchAnalysisPanel.tsx",
    "utf8"
  );

test(
  "Account exposes Advanced Batch Analysis",
  () => {
    assert.ok(
      account.includes(
        "<BatchAnalysisPanel />"
      )
    );
  }
);

test(
  "Batch Analysis access is server gated and no-store",
  () => {
    assert.ok(
      route.includes(
        "canUseBatchAnalysis"
      )
    );

    assert.ok(
      route.includes(
        '"Cache-Control":\n          "no-store"'
      )
    );

    assert.ok(
      route.includes(
        'quotaMode:\n      "normal_analysis_quota"'
      )
    );
  }
);

test(
  "Batch Analysis reuses canonical intelligence sequentially",
  () => {
    assert.ok(
      panel.includes(
        '"/api/intelligence"'
      )
    );

    assert.ok(
      panel.includes(
        "for ("
      )
    );

    assert.equal(
      panel.includes(
        "Promise.all("
      ),
      false
    );
  }
);
