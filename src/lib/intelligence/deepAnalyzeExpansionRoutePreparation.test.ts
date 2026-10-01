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
  "Zcash and Algorand engines remain prepared across API surfaces",
  () => {
    for (
      const file of files
    ) {
      const source =
        fs.readFileSync(
          file,
          "utf8"
        );

      assert.ok(
        source.includes(
          "runZcashIntelligence"
        ),
        file
      );

      assert.ok(
        source.includes(
          "runAlgorandIntelligence"
        ),
        file
      );
    }
  }
);

test(
  "Zcash and Algorand resolve after promotion",
  () => {
    for (
      const network of [
        "zcash",
        "algorand",
      ] as const
    ) {
      assert.equal(
        resolveIntelligenceNetwork(
          network
        ).ok,
        true,
        network
      );
    }
  }
);
