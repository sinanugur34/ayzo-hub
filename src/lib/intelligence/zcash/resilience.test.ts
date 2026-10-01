import assert from "node:assert/strict";
import test from "node:test";

import {
  getZcashResilientEvidence,
} from "./resilience";

import type {
  ZcashEvidence,
  ZcashProviderResult,
} from "./types";

const INPUT = {
  address:
    "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH",

  analysisPlan:
    "free" as const,
};

function failure(
  code:
    "RATE_LIMITED" |
    "UPSTREAM_ERROR" |
    "NOT_FOUND"
): ZcashProviderResult<
  ZcashEvidence
> {
  return {
    ok:
      false,

    providerId:
      "zcash-blockchair",

    latencyMs:
      1,

    code,

    error:
      code,
  };
}

test(
  "Zcash resilience uses independent fallback after upstream primary failure",
  async () => {
    let fallbackCalls =
      0;

    const result =
      await getZcashResilientEvidence(
        INPUT,
        {
          primary:
            async () =>
              failure(
                "UPSTREAM_ERROR"
              ),

          fallback:
            async () => {
              fallbackCalls +=
                1;

              return {
                ok:
                  false,

                providerId:
                  "zcash-nownodes",

                latencyMs:
                  1,

                code:
                  "RATE_LIMITED",

                error:
                  "fallback",
              };
            },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      fallbackCalls,
      1
    );
  }
);

test(
  "Zcash resilience does not fallback on canonical not-found result",
  async () => {
    let fallbackCalls =
      0;

    const result =
      await getZcashResilientEvidence(
        INPUT,
        {
          primary:
            async () =>
              failure(
                "NOT_FOUND"
              ),

          fallback:
            async () => {
              fallbackCalls +=
                1;

              return failure(
                "UPSTREAM_ERROR"
              );
            },
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      fallbackCalls,
      0
    );
  }
);
