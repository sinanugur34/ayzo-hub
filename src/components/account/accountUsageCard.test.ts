import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("account displays live plan quota usage", () => {
  const card = fs.readFileSync(
    "src/components/account/AccountUsageCard.tsx",
    "utf8"
  );

  const page = fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

  assert.ok(card.includes('"/api/free/status"'));
  assert.ok(card.includes("status.limit"));
  assert.ok(card.includes("status.remaining"));
  assert.ok(card.includes("resetAt"));
  assert.ok(card.includes('"ayzo:quota-updated"'));

  assert.ok(
    page.includes(
      'import AccountUsageCard from "@/components/account/AccountUsageCard";'
    )
  );

  assert.ok(
    page.includes("<AccountUsageCard />")
  );
});
