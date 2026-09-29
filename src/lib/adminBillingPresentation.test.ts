import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "src/app/admin/page.tsx",
    "utf8"
  );

const compact =
  page.replace(
    /\s+/g,
    " "
  );

test(
  "Admin billing presentation uses effective billing semantics",
  () => {
    assert.match(
      page,
      /label="Paid access users"/
    );

    assert.match(
      page,
      /billing[\s\S]*?\.activeSubscriptions/
    );

    assert.match(
      page,
      /label="Revenue providers"/
    );

    assert.match(
      page,
      /label="Internal \/ review"/
    );

    assert.match(
      page,
      /nonRevenuePaidAccess/
    );

    assert.match(
      page,
      /EFFECTIVE ACCESS MIX/
    );

    assert.equal(
      compact.includes(
        "snapshot .subscriptions"
      ),
      false
    );
  }
);
