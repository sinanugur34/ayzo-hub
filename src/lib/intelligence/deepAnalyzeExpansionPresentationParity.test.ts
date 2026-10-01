import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

const mobile =
  fs.readFileSync(
    "mobile/src/mobileEvidenceWorkspace.ts",
    "utf8"
  );

for (
  const network of [
    "zcash",
    "algorand",
  ] as const
) {
  test(
    `${network} presentation is prepared without live promotion`,
    () => {
      assert.equal(
        fs.existsSync(
          `src/lib/intelligence/${network}/presentation.ts`
        ),
        true
      );

      assert.ok(
        mobile.includes(
          `networkId ===\n      "${network}"`
        )
      );

      assert.equal(
        NETWORKS[
          network
        ].status,
        "development"
      );

      const resolution =
        resolveIntelligenceNetwork(
          network
        );

      assert.equal(
        resolution.ok,
        false
      );
    }
  );
}

test(
  "Wave 2A preserves exactly twenty-five live networks",
  () => {
    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      live.length,
      25
    );
  }
);
