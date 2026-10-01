import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

const home =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const batch =
  fs.readFileSync(
    "src/components/account/BatchAnalysisPanel.tsx",
    "utf8"
  );

test(
  "home and batch derive thirty public choices from canonical live state",
  () => {
    assert.ok(
      home.includes(
        "NETWORK_IDS.filter"
      )
    );

    assert.ok(
      batch.includes(
        "NETWORK_IDS.filter"
      )
    );

    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      live.length,
      30
    );

    for (
      const id of [
        "zcash",
        "algorand",
        "polkadot",
        "cosmos",
        "injective",
      ] as const
    ) {
      assert.equal(
        live.includes(
          id
        ),
        true,
        id
      );
    }

    assert.equal(
      live.includes(
        "near"
      ),
      false
    );
  }
);
