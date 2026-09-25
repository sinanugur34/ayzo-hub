import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("account exposes live analysis quota usage", () => {
  const card = fs.readFileSync(
    "src/components/account/AccountUsageCard.tsx",
    "utf8"
  );

  const page = fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

  assert.ok(
    card.includes('"/api/free/status"')
  );

  assert.ok(
    card.includes("remaining")
  );

  assert.ok(
    card.includes("status.limit")
  );

  assert.ok(
    card.includes("resetAt")
  );

  assert.ok(
    card.includes('"ayzo:quota-updated"')
  );

  assert.ok(
    page.includes(
      'import AccountUsageCard from "@/components/account/AccountUsageCard";'
    )
  );

  assert.equal(
    page.split("<AccountUsageCard />").length - 1,
    1
  );

  assert.equal(
    /\b(?:3|25|90)\s+analyses/.test(card),
    false
  );
});
