import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

test(
  "home hero derives live network count from registry-backed LIVE_NETWORKS",
  () => {
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

test(
  "home research desk derives network count from registry-backed LIVE_NETWORKS",
  () => {
    assert.ok(
      source.includes(
        "{LIVE_NETWORKS.length} networks"
      )
    );

    assert.equal(
      /\b17 networks\b/.test(
        source
      ),
      false
    );
  }
);

test(
  "home network-count copy contains no hardcoded live-network total",
  () => {
    assert.equal(
      /\b\d+\s+live networks\b/.test(
        source
      ),
      false
    );

    assert.equal(
      /\b17\s+networks\b/.test(
        source
      ),
      false
    );
  }
);
