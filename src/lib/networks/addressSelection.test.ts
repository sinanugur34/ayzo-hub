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


test(
  "keeps BNB and Arbitrum selected for ambiguous EVM addresses",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "bnb",
        "evm"
      ),
      "bnb"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "arbitrum",
        "evm"
      ),
      "arbitrum"
    );
  }
);

test(
  "keeps Polygon, Optimism, and Avalanche selected for valid EVM addresses",
  () => {
    for (
      const networkId of [
        "polygon",
        "optimism",
        "avalanche",
      ] as const
    ) {
      assert.equal(
        resolveSelectedNetworkForAddress(
          networkId,
          "evm"
        ),
        networkId
      );
    }
  }
);


test(
  "keeps Linea, Scroll, and Mantle selected for valid EVM addresses",
  () => {
    for (
      const networkId of [
        "linea",
        "scroll",
        "mantle",
      ] as const
    ) {
      assert.equal(
        resolveSelectedNetworkForAddress(
          networkId,
          "evm"
        ),
        networkId
      );
    }
  }
);


test(
  "keeps Sonic and Monad selected for valid EVM addresses",
  () => {
    for (
      const networkId of [
        "sonic",
        "monad",
      ] as const
    ) {
      assert.equal(
        resolveSelectedNetworkForAddress(
          networkId,
          "evm"
        ),
        networkId
      );
    }
  }
);
