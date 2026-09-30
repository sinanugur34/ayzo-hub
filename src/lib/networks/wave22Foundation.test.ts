import assert from "node:assert/strict";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "./registry";

import {
  resolveIntelligenceNetwork,
} from "../intelligence/router";

import {
  isLitecoinMainnetAddress,
} from "../intelligence/litecoin/address";

import {
  isSuiAddress,
} from "../intelligence/sui/address";

import {
  isTonAddress,
} from "../intelligence/ton/address";

import {
  isHyperliquidAddress,
} from "../intelligence/hyperliquid/address";

import {
  isStellarAccountAddress,
} from "../intelligence/stellar/address";

const REMAINING_WAVE = [
  "sui",
  "ton",
  "hyperliquid",
  "stellar",
] as const;

test(
  "registry contains 22 networks with Litecoin promoted after full gates",
  () => {
    assert.equal(
      NETWORK_IDS.length,
      22
    );

    const live =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id]
            .status ===
          "live"
      );

    assert.equal(
      live.length,
      18
    );

    assert.equal(
      NETWORKS.litecoin.status,
      "live"
    );

    const litecoin =
      resolveIntelligenceNetwork(
        "litecoin"
      );

    assert.equal(
      litecoin.ok,
      true
    );

    if (litecoin.ok) {
      assert.equal(
        litecoin.engine,
        "litecoin"
      );
    }

    for (
      const id of
      REMAINING_WAVE
    ) {
      assert.equal(
        NETWORKS[id].status,
        "development"
      );

      const resolved =
        resolveIntelligenceNetwork(
          id
        );

      assert.equal(
        resolved.ok,
        false
      );
    }
  }
);

test(
  "validates Litecoin mainnet addresses",
  () => {
    assert.equal(
      isLitecoinMainnetAddress(
        "LKDxGDJq5fF4FohAB8zJH24mDDNHDNtqsE"
      ),
      true
    );

    assert.equal(
      isLitecoinMainnetAddress(
        "M7uAERuQW2AotfyLDyewFGcLUDtAYu9v5V"
      ),
      true
    );
  }
);

test(
  "remaining native validators stay available while gated",
  () => {
    assert.equal(
      isSuiAddress(
        `0x${"11".repeat(32)}`
      ),
      true
    );

    assert.equal(
      isTonAddress(
        `0:${"22".repeat(32)}`
      ),
      true
    );

    assert.equal(
      isHyperliquidAddress(
        `0x${"33".repeat(20)}`
      ),
      true
    );

    assert.equal(
      isStellarAccountAddress(
        "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ"
      ),
      true
    );
  }
);
