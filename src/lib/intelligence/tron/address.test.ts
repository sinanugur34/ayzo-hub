import assert from "node:assert/strict";
import test from "node:test";

import {
  isTronAddress,
} from "./address";

test(
  "accepts valid TRON Base58Check addresses",
  () => {
    assert.equal(
      isTronAddress(
        "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8"
      ),
      true
    );

    assert.equal(
      isTronAddress(
        "TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL"
      ),
      true
    );
  }
);

test(
  "rejects invalid TRON addresses",
  () => {
    assert.equal(
      isTronAddress(
        "not-a-tron-address"
      ),
      false
    );

    assert.equal(
      isTronAddress(
        "TJRabPrwbZy45sbavfcjinPJC18kjpRTv9"
      ),
      false
    );

    assert.equal(
      isTronAddress(
        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"
      ),
      false
    );

    assert.equal(
      isTronAddress(
        "11111111111111111111111111111111"
      ),
      false
    );
  }
);

test(
  "normalizes surrounding whitespace before validation",
  () => {
    assert.equal(
      isTronAddress(
        "  TJRabPrwbZy45sbavfcjinPJC18kjpRTv8  "
      ),
      true
    );
  }
);
