import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeCardanoMainnetAddress,
  isCardanoMainnetAddress,
  isCardanoPaymentAddress,
  isCardanoStakeAddress,
} from "./address";

/*
 * Official CIP-19 MAINNET test vectors.
 *
 * type-06:
 *   Shelley enterprise payment-key address
 *   header = 0x61
 *   type = 6
 *   network tag = 1
 *
 * type-14:
 *   stake/reward key address
 *   header = 0xe1
 *   type = 14
 *   network tag = 1
 */
const MAINNET_PAYMENT =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

const MAINNET_STAKE =
  "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw";

/*
 * Official CIP-19 TESTNET vectors.
 * These must be rejected by AYZO's mainnet-only validator.
 */
const TESTNET_PAYMENT =
  "addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz";

const TESTNET_STAKE =
  "stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn";

test(
  "accepts official CIP-19 mainnet payment vector",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        MAINNET_PAYMENT
      ),
      true
    );

    assert.equal(
      isCardanoPaymentAddress(
        MAINNET_PAYMENT
      ),
      true
    );

    assert.equal(
      isCardanoStakeAddress(
        MAINNET_PAYMENT
      ),
      false
    );

    const decoded =
      decodeCardanoMainnetAddress(
        MAINNET_PAYMENT
      );

    assert.ok(
      decoded
    );

    assert.equal(
      decoded?.hrp,
      "addr"
    );

    assert.equal(
      decoded?.addressType,
      6
    );

    assert.equal(
      decoded?.networkId,
      1
    );

    assert.equal(
      decoded?.bytes[0],
      0x61
    );
  }
);

test(
  "accepts official CIP-19 mainnet stake vector",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        MAINNET_STAKE
      ),
      true
    );

    assert.equal(
      isCardanoStakeAddress(
        MAINNET_STAKE
      ),
      true
    );

    assert.equal(
      isCardanoPaymentAddress(
        MAINNET_STAKE
      ),
      false
    );

    const decoded =
      decodeCardanoMainnetAddress(
        MAINNET_STAKE
      );

    assert.ok(
      decoded
    );

    assert.equal(
      decoded?.hrp,
      "stake"
    );

    assert.equal(
      decoded?.addressType,
      14
    );

    assert.equal(
      decoded?.networkId,
      1
    );

    assert.equal(
      decoded?.bytes[0],
      0xe1
    );
  }
);

test(
  "rejects official CIP-19 testnet vectors",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        TESTNET_PAYMENT
      ),
      false
    );

    assert.equal(
      isCardanoMainnetAddress(
        TESTNET_STAKE
      ),
      false
    );
  }
);

test(
  "trims surrounding whitespace without weakening validation",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        `  ${MAINNET_PAYMENT}  `
      ),
      true
    );

    assert.equal(
      isCardanoMainnetAddress(
        `  ${MAINNET_STAKE}  `
      ),
      true
    );
  }
);

test(
  "accepts canonical all-uppercase Bech32 representation",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        MAINNET_PAYMENT.toUpperCase()
      ),
      true
    );
  }
);

test(
  "rejects mixed-case Bech32",
  () => {
    const mixed =
      MAINNET_PAYMENT
        .slice(
          0,
          8
        )
        .toUpperCase() +
      MAINNET_PAYMENT.slice(
        8
      );

    assert.equal(
      isCardanoMainnetAddress(
        mixed
      ),
      false
    );
  }
);

test(
  "rejects malformed checksum and malformed Cardano inputs",
  () => {
    assert.equal(
      isCardanoMainnetAddress(
        "not-cardano"
      ),
      false
    );

    const checksumBroken =
      MAINNET_PAYMENT.slice(
        0,
        -1
      ) +
      (
        MAINNET_PAYMENT.endsWith(
          "q"
        )
          ? "p"
          : "q"
      );

    assert.equal(
      isCardanoMainnetAddress(
        checksumBroken
      ),
      false
    );

    assert.equal(
      isCardanoMainnetAddress(
        ""
      ),
      false
    );
  }
);
