import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORK_IDS,
} from "@/lib/networks/registry";

import {
  CHAINLINK_INTELLIGENCE_CONTRACT,
} from "./contract";

test(
  "Chainlink is a protocol intelligence surface and not a synthetic network",
  () => {
    assert.equal(
      CHAINLINK_INTELLIGENCE_CONTRACT
        .countsAsNetwork,
      false
    );

    assert.equal(
      CHAINLINK_INTELLIGENCE_CONTRACT
        .status,
      "development"
    );

    assert.deepEqual(
      CHAINLINK_INTELLIGENCE_CONTRACT
        .initialSurfaces,
      [
        "link-token",
        "ccip",
        "data-feeds",
      ]
    );

    assert.equal(
      NETWORK_IDS
        .map(String)
        .includes(
          "chainlink"
        ),
      false
    );
  }
);

test(
  "Chainlink contract keeps underlying-chain identity explicit",
  () => {
    const rules =
      CHAINLINK_INTELLIGENCE_CONTRACT
        .evidenceRules
        .join(" ");

    assert.match(
      rules,
      /underlying blockchain/i
    );

    assert.match(
      rules,
      /source and destination network/i
    );

    assert.match(
      rules,
      /does not create a synthetic blockchain/i
    );
  }
);
