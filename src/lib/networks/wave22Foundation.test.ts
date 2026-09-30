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

const WAVE_22 = [
  "litecoin",
  "sui",
  "ton",
  "hyperliquid",
  "stellar",
] as const;

test(
  "registry contains 22 networks while wave-22 remains gated",
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
      17
    );

    for (
      const id of
      WAVE_22
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

      if (!resolved.ok) {
        assert.equal(
          resolved.code,
          "NETWORK_NOT_AVAILABLE"
        );
      }
    }
  }
);

test(
  "validates Litecoin mainnet Base58Check addresses",
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

    assert.equal(
      isLitecoinMainnetAddress(
        "not-a-litecoin-address"
      ),
      false
    );
  }
);

test(
  "validates Sui 32-byte addresses",
  () => {
    assert.equal(
      isSuiAddress(
        `0x${"11".repeat(32)}`
      ),
      true
    );

    assert.equal(
      isSuiAddress(
        `0x${"11".repeat(20)}`
      ),
      false
    );
  }
);

test(
  "validates TON raw mainnet account form",
  () => {
    assert.equal(
      isTonAddress(
        `0:${"22".repeat(32)}`
      ),
      true
    );

    assert.equal(
      isTonAddress(
        `2:${"22".repeat(32)}`
      ),
      false
    );
  }
);

test(
  "validates Hyperliquid user addresses",
  () => {
    assert.equal(
      isHyperliquidAddress(
        `0x${"33".repeat(20)}`
      ),
      true
    );

    assert.equal(
      isHyperliquidAddress(
        `0x${"33".repeat(19)}`
      ),
      false
    );
  }
);

test(
  "validates Stellar classic account StrKey",
  () => {
    assert.equal(
      isStellarAccountAddress(
        "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ"
      ),
      true
    );

    assert.equal(
      isStellarAccountAddress(
        "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JA"
      ),
      false
    );
  }
);
