import assert from "node:assert/strict";
import test from "node:test";

import {
  getWave30BProviderReadiness,
} from "./wave30BProviderReadiness";

function withCredentials(
  near:
    string | undefined,
  hedera:
    string | undefined,
  fn:
    () => void
) {
  const oldNear =
    process.env
      .NEARBLOCKS_API_KEY;

  const oldHedera =
    process.env
      .HGRAPH_API_KEY;

  if (near) {
    process.env
      .NEARBLOCKS_API_KEY =
      near;
  } else {
    delete process.env
      .NEARBLOCKS_API_KEY;
  }

  if (hedera) {
    process.env
      .HGRAPH_API_KEY =
      hedera;
  } else {
    delete process.env
      .HGRAPH_API_KEY;
  }

  try {
    fn();
  } finally {
    if (oldNear) {
      process.env
        .NEARBLOCKS_API_KEY =
        oldNear;
    } else {
      delete process.env
        .NEARBLOCKS_API_KEY;
    }

    if (oldHedera) {
      process.env
        .HGRAPH_API_KEY =
        oldHedera;
    } else {
      delete process.env
        .HGRAPH_API_KEY;
    }
  }
}

test(
  "Wave B production readiness fails closed without provider credentials",
  () => {
    withCredentials(
      undefined,
      undefined,
      () => {
        const result =
          getWave30BProviderReadiness();

        assert.equal(
          result.near
            .configured,
          false
        );

        assert.equal(
          result.hedera
            .configured,
          false
        );
      }
    );
  }
);

test(
  "Wave B production readiness recognizes both configured providers",
  () => {
    withCredentials(
      "near-test",
      "hedera-test",
      () => {
        const result =
          getWave30BProviderReadiness();

        assert.equal(
          result.near
            .configured,
          true
        );

        assert.equal(
          result.hedera
            .configured,
          true
        );
      }
    );
  }
);
