import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "home hero derives live network count from registry-backed LIVE_NETWORKS",
  () => {
    const source =
      fs.readFileSync(
        "src/app/page.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "{LIVE_NETWORKS.length} live networks"
      )
    );

    assert.equal(
      /across\s+\d+\s+live networks/.test(
        source
      ),
      false
    );
  }
);
