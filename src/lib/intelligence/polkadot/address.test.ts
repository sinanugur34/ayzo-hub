import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePolkadotAddress,
} from "./address";

/*
 * Polkadot-format mainnet account published
 * in current Substrate/Subscan documentation.
 */
const VALID =
  "14RYaXRSqb9rPqMaAVp1UZW2czQ6dMNGMbvukwfifi6m8ZgZ";

test(
  "accepts checksum-valid Polkadot SS58 mainnet account",
  () => {
    assert.equal(
      normalizePolkadotAddress(
        VALID
      ),
      VALID
    );
  }
);

test(
  "trims whitespace without weakening Polkadot checksum validation",
  () => {
    assert.equal(
      normalizePolkadotAddress(
        ` ${VALID} `
      ),
      VALID
    );
  }
);

test(
  "rejects mutated and non-Polkadot SS58 accounts",
  () => {
    const mutated =
      VALID.slice(
        0,
        -1
      ) +
      (
        VALID.endsWith(
          "1"
        )
          ? "2"
          : "1"
      );

    assert.equal(
      normalizePolkadotAddress(
        mutated
      ),
      null
    );

    assert.equal(
      normalizePolkadotAddress(
        "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      ),
      null
    );
  }
);
