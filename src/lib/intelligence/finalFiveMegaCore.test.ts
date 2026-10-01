import assert from "node:assert/strict";
import test from "node:test";

import {
  runPolkadotIntelligence,
} from "./polkadot/engine";

import {
  runInjectiveIntelligence,
} from "./injective/engine";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

test(
  "final five are live after native core and product acceptance",
  () => {
    const finalFive = [
      "zcash",
      "algorand",
      "polkadot",
      "cosmos",
      "injective",
    ] as const;

    for (
      const id of finalFive
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live"
      );
    }

    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      ).length,
      30
    );

    assert.equal(
      NETWORKS.near.status,
      "development"
    );
  }
);

test(
  "Polkadot engine fails closed before provider work on invalid address",
  async () => {
    let called =
      false;

    const result =
      await runPolkadotIntelligence(
        {
          address:
            "invalid",
        },
        {
          loadEvidence:
            async () => {
              called =
                true;

              throw new Error(
                "must not run"
              );
            },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "Injective engine fails closed before provider work on invalid address",
  async () => {
    let called =
      false;

    const result =
      await runInjectiveIntelligence(
        {
          address:
            "inj1invalid",
        },
        {
          loadEvidence:
            async () => {
              called =
                true;

              throw new Error(
                "must not run"
              );
            },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);
