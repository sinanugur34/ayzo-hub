import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("unsupported notification channels are not advertised as roadmap", () => {
  const matrix = fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

  const registry = fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

  assert.ok(
    matrix.includes(
      '"Browser notifications"'
    )
  );

  assert.ok(
    matrix.includes(
      '"Telegram notifications"'
    )
  );

  assert.equal(
    matrix.includes(
      '"Browser notifications",\n          detail:\n            "Not enabled yet."'
    ),
    false
  );

  assert.equal(
    matrix.includes(
      '"Telegram notifications",\n          detail:\n            "Not enabled yet."'
    ),
    false
  );

  assert.ok(
    registry.includes(
      '"mobileApp"'
    )
  );
});
