import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/AnalysisLimitCard.tsx",
  "utf8"
);

test("analysis limit card uses live Pro checkout instead of legacy waitlist", () => {
  assert.match(
    source,
    /PlanCheckoutButton/
  );

  assert.match(
    source,
    /plan="pro"/
  );

  assert.doesNotMatch(
    source,
    /AYZO PRO · COMING SOON/
  );

  assert.doesNotMatch(
    source,
    /WaitlistForm/
  );
});
