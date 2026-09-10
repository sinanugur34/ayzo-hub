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

test(
  "selects Bitcoin for a detected Bitcoin address regardless of prior selection",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "solana",
        "bitcoin"
      ),
      "bitcoin"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "base",
        "bitcoin"
      ),
      "bitcoin"
    );
  }
);

test(
  "selects Dogecoin for a detected Dogecoin address regardless of prior selection",
  () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "solana",
        "dogecoin"
      ),
      "dogecoin"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "dogecoin"
      ),
      "dogecoin"
    );
  }
);

test(
  "selects TRON for a detected TRON address and recognizes it as live",
  async () => {
    assert.equal(
      resolveSelectedNetworkForAddress(
        "solana",
        "tron"
      ),
      "tron"
    );

    assert.equal(
      resolveSelectedNetworkForAddress(
        "ethereum",
        "tron"
      ),
      "tron"
    );

    const {
      isLiveAnalysisNetworkId,
    } = await import(
      "./addressSelection"
    );

    assert.equal(
      isLiveAnalysisNetworkId(
        "tron"
      ),
      true
    );
  }
);

test(
  "recognizes Bitcoin, Ethereum, and Dogecoin as live networks",
  async () => {
    const {
      isLiveAnalysisNetworkId,
    } = await import(
      "./addressSelection"
    );

    assert.equal(
      isLiveAnalysisNetworkId(
        "bitcoin"
      ),
      true
    );

    assert.equal(
      isLiveAnalysisNetworkId(
        "ethereum"
      ),
      true
    );

    assert.equal(
      isLiveAnalysisNetworkId(
        "dogecoin"
      ),
      true
    );
  }
);
