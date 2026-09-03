import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSelectedNetworkForAddress,
} from "./addressSelection";

test(
  "keeps the selected EVM network for a valid 0x address",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "base",
        "evm"
      ),
      "base"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "evm"
      ),
      "ethereum"
    );
  }
);

test(
  "defaults a valid 0x address to Ethereum when Solana is selected",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "solana",
        "evm"
      ),
      "ethereum"
    );
  }
);

test(
  "selects Solana for a valid Solana address and rejects invalid input",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "base",
        "solana"
      ),
      "solana"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "base",
        "invalid"
      ),
      null
    );
  }
);
