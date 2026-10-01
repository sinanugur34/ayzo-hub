import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

const files = [
  "src/app/api/intelligence/route.ts",
  "src/app/api/mobile/intelligence/route.ts",
  "src/app/api/v1/intelligence/route.ts",
];

test(
  "Zcash and Algorand engines are prepared across API surfaces",
  () => {
    for (
      const file of files
    ) {
      const source =
        fs.readFileSync(
          file,
          "utf8"
        );

      assert.equal(
        source.includes(
          "runZcashIntelligence"
        ),
        true,
        file
      );

      assert.equal(
        source.includes(
          "runAlgorandIntelligence"
        ),
        true,
        file
      );
    }
  }
);

test(
  "prepared expansion routes remain fail closed while development",
  () => {
    for (
      const network of [
        "zcash",
        "algorand",
      ]
    ) {
      const resolution =
        resolveIntelligenceNetwork(
          network
        );

      assert.equal(
        resolution.ok,
        false
      );

      if (!resolution.ok) {
        assert.equal(
          resolution.code,
          "NETWORK_NOT_AVAILABLE"
        );
      }
    }
  }
);
