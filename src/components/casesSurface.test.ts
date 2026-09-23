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

const casePage =
  fs.readFileSync(
    "src/app/account/cases/[caseId]/page.tsx",
    "utf8"
  );

test(
  "Account exposes Advanced Cases workspace",
  () => {
    assert.ok(
      account.includes(
        "<CasesPanel />"
      )
    );
  }
);

test(
  "analysis actions expose Add to Case flow",
  () => {
    assert.ok(
      actions.includes(
        "CaseQuickAdd"
      )
    );

    assert.ok(
      actions.includes(
        "savedAnalysisId"
      )
    );
  }
);

test(
  "case detail remains server plan gated",
  () => {
    assert.ok(
      casePage.includes(
        "planHasFeature"
      )
    );

    assert.ok(
      casePage.includes(
        '"cases"'
      )
    );
  }
);
