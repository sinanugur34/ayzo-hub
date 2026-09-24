import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const actions =
  fs.readFileSync(
    "src/components/AnalysisActions.tsx",
    "utf8"
  );

test(
  "Account exposes Evidence Locker panel",
  () => {
    assert.ok(
      account.includes(
        "<EvidenceLockerPanel />"
      )
    );
  }
);

test(
  "Analysis actions expose Evidence Locker quick add",
  () => {
    assert.ok(
      actions.includes(
        "EvidenceLockerQuickAdd"
      )
    );

    assert.ok(
      actions.includes(
        "ensureSavedAnalysis"
      )
    );
  }
);
