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
  "final five remain development gated while native cores are built",
  () => {
    const finalFive = [
      "zcash",
      "algorand",
      "polkadot",
      "cosmos",
      "injective",
    ] as const;

    for (
      const id of
      finalFive
    ) {
      assert.equal(
        NETWORKS[id].status,
        "development"
      );
    }

    assert.equal(
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      ).length,
      25
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
