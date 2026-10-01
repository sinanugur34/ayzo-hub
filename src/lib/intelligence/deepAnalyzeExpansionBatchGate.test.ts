import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

const batch =
  fs.readFileSync(
    "src/components/account/BatchAnalysisPanel.tsx",
    "utf8"
  );

test(
  "Batch Analysis remains canonical-live derived before expansion promotion",
  () => {
    assert.ok(
      batch.includes(
        "NETWORK_IDS.filter"
      )
    );

    assert.ok(
      batch.includes(
        '.status ==='
      )
    );

    assert.ok(
      batch.includes(
        '"live"'
      )
    );

    const selectable =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      selectable.length,
      25
    );

    assert.equal(
      selectable.includes(
        "zcash"
      ),
      false
    );

    assert.equal(
      selectable.includes(
        "algorand"
      ),
      false
    );
  }
);
