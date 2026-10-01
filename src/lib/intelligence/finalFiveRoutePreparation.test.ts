import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

const routes = [
  "src/app/api/intelligence/route.ts",
  "src/app/api/mobile/intelligence/route.ts",
  "src/app/api/v1/intelligence/route.ts",
];

test(
  "Polkadot Cosmos and Injective engines remain prepared across API surfaces",
  () => {
    for (
      const path of routes
    ) {
      const source =
        fs.readFileSync(
          path,
          "utf8"
        );

      for (
        const engine of [
          "runPolkadotIntelligence",
          "runCosmosIntelligence",
          "runInjectiveIntelligence",
        ]
      ) {
        assert.ok(
          source.includes(
            engine
          ),
          `${path} missing ${engine}`
        );
      }
    }
  }
);

test(
  "all final five resolve through public router after promotion",
  () => {
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
        NETWORKS[id].status,
        "live"
      );

      assert.equal(
        resolveIntelligenceNetwork(
          id
        ).ok,
        true,
        id
      );
    }
  }
);
