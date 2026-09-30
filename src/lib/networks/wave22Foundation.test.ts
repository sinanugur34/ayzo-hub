import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  type NetworkId,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "../intelligence/router";

/*
 * Historical Wave22 contract.
 *
 * This list deliberately remains 22 networks even
 * after later waves expand the canonical registry.
 *
 * The purpose of this test is regression protection:
 * Wave30 must not break any network accepted in Wave22.
 */
const WAVE22_NETWORK_IDS = [
  "solana",
  "ethereum",
  "base",
  "bnb",
  "arbitrum",
  "polygon",
  "optimism",
  "avalanche",
  "linea",
  "scroll",
  "mantle",
  "sonic",
  "monad",
  "dogecoin",
  "bitcoin",
  "tron",
  "xrp",
  "litecoin",
  "sui",
  "ton",
  "hyperliquid",
  "stellar",
] as const satisfies readonly NetworkId[];

test(
  "preserves all twenty-two Wave22 networks as live and resolvable",
  () => {
    assert.equal(
      WAVE22_NETWORK_IDS.length,
      22
    );

    for (
      const id of
      WAVE22_NETWORK_IDS
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live",
        `${id} Wave22 regression: network must remain live`
      );

      const resolution =
        resolveIntelligenceNetwork(
          id
        );

      assert.equal(
        resolution.ok,
        true,
        `${id} Wave22 regression: network must remain resolvable`
      );
    }
  }
);
