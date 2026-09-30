import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardanoEvidence,
} from "./provider";

const ADDRESS =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

test(
  "falls back only for upstream-style Cardano failures",
  async () => {
    let fallbackCalled =
      false;

    const result =
      await getCardanoEvidence(
        {
          address:
            ADDRESS,
          analysisPlan:
            "free",
        },
        {
          async primary() {
            return {
              ok:
                false,
              providerId:
                "cardano-blockfrost",
              latencyMs:
                1,
              code:
                "RATE_LIMITED",
              error:
                "rate limit",
            };
          },

          async fallback() {
            fallbackCalled =
              true;

            return {
              ok:
                false,
              providerId:
                "cardano-koios",
              latencyMs:
                1,
              code:
                "UPSTREAM_ERROR",
              error:
                "fallback unavailable",
            };
          },
        }
      );

    assert.equal(
      fallbackCalled,
      true
    );

    assert.equal(
      result.ok,
      false
    );
  }
);

test(
  "does not fallback on Cardano validation failure",
  async () => {
    let fallbackCalled =
      false;

    await getCardanoEvidence(
      {
        address:
          "invalid",
        analysisPlan:
          "free",
      },
      {
        async primary() {
          return {
            ok:
              false,
            providerId:
              "cardano-blockfrost",
            latencyMs:
              0,
            code:
              "INVALID_ADDRESS",
            error:
              "invalid",
          };
        },

        async fallback() {
          fallbackCalled =
            true;

          throw new Error(
            "must not run"
          );
        },
      }
    );

    assert.equal(
      fallbackCalled,
      false
    );
  }
);
