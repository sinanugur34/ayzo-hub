import assert from "node:assert/strict";
import test from "node:test";

import {
  isDogecoinMainnetAddress,
} from "./address";

test(
  "accepts Dogecoin mainnet P2PKH addresses",
  () => {
    assert.equal(
      isDogecoinMainnetAddress(
        "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L"
      ),
      true
    );

    assert.equal(
      isDogecoinMainnetAddress(
        "D596YFweJQuHY1BbjazZYmAbt8jJPbKehC"
      ),
      true
    );
  }
);

test(
  "accepts Dogecoin mainnet P2SH addresses",
  () => {
    assert.equal(
      isDogecoinMainnetAddress(
        "9rSGfPZLcyCGzY4uYEL1fkzJr6fkicS2rs"
      ),
      true
    );
  }
);

test(
  "rejects Bitcoin, malformed, and checksum-invalid addresses",
  () => {
    for (
      const address of [
        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
        "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7M",
        "not-dogecoin",
        "",
      ]
    ) {
      assert.equal(
        isDogecoinMainnetAddress(
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
      isDogecoinMainnetAddress(
        "  DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L  "
      ),
      true
    );
  }
);
