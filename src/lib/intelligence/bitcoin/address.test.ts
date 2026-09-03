import assert from "node:assert/strict";
import test from "node:test";

import {
  isBitcoinMainnetAddress,
} from "./address";

test(
  "accepts valid Bitcoin mainnet legacy addresses",
  () => {
    assert.equal(
      isBitcoinMainnetAddress(
        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"
      ),
      true
    );

    assert.equal(
      isBitcoinMainnetAddress(
        "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo"
      ),
      true
    );
  }
);

test(
  "accepts BIP350 Bitcoin mainnet SegWit v0 and Taproot vectors",
  () => {
    assert.equal(
      isBitcoinMainnetAddress(
        "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4"
      ),
      true
    );

    assert.equal(
      isBitcoinMainnetAddress(
        "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0"
      ),
      true
    );
  }
);

test(
  "rejects checksum, network, casing, and encoding failures",
  () => {
    const invalidAddresses = [
      "1BoatSLRHtKNngkdXEeobR76b53LETtpyU",

      "tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut",

      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd",

      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh",

      "bc1P0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",

      "not-bitcoin",
    ];

    for (
      const address of
        invalidAddresses
    ) {
      assert.equal(
        isBitcoinMainnetAddress(
          address
        ),
        false,
        address
      );
    }
  }
);

test(
  "trims surrounding whitespace without weakening validation",
  () => {
    assert.equal(
      isBitcoinMainnetAddress(
        "  34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo  "
      ),
      true
    );

    assert.equal(
      isBitcoinMainnetAddress(
        "  not-bitcoin  "
      ),
      false
    );
  }
);
