import assert from "node:assert/strict";
import test from "node:test";

import {
  runZcashIntelligence,
} from "./engine";

import type {
  ZcashEvidence,
} from "./types";

const ROOT =
  "t1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH";

test(
  "rejects invalid Zcash address before provider work",
  async () => {
    let calls =
      0;

    const result =
      await runZcashIntelligence(
        {
          address:
            "not-zcash",
        },
        {
          loadEvidence:
            async () => {
              calls +=
                1;

              throw new Error(
                "provider must not run"
              );
            },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      result.data.ok,
      false
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "shielded-like Zcash input fails closed without provider work",
  async () => {
    let calls =
      0;

    const result =
      await runZcashIntelligence(
        {
          address:
            "zs1qqqqqqqqqqqqqqqqqqqqqq",
        },
        {
          loadEvidence:
            async () => {
              calls +=
                1;

              throw new Error(
                "provider must not run"
              );
            },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      result.data.ok,
      false
    );

    if (!result.data.ok) {
      assert.equal(
        result.data.code,
        "SHIELDED_ADDRESS_NOT_PUBLICLY_TRACEABLE"
      );
    }

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "runs native transparent Zcash Deep Analyze from explicit evidence",
  async () => {
    const evidence:
      ZcashEvidence = {
        network:
          "zcash",

        address:
          ROOT,

        addressKind:
          "transparent-p2pkh",

        analysisPlan:
          "free",

        balanceZatoshis:
          "500",

        totalReceivedZatoshis:
          "500",

        totalSpentZatoshis:
          "0",

        transactions:
          [],

        utxos:
          [],

        canonicalTransactions:
          [],

        coverage: {
          plan:
            "free",

          historyLimit:
            16,

          canonicalSampleLimit:
            4,

          utxoLimit:
            24,

          providerRequestBudget:
            12,

          providerRequestsUsed:
            1,

          historyHasMore:
            false,

          utxosHaveMore:
            false,

          canonicalRequested:
            0,

          canonicalVerified:
            0,

          canonicalUnavailable:
            0,
        },
      };

    const result =
      await runZcashIntelligence(
        {
          address:
            ROOT,

          analysisPlan:
            "free",
        },
        {
          loadEvidence:
            async () => ({
              ok:
                true,

              providerId:
                "zcash-blockchair",

              latencyMs:
                1,

              data:
                evidence,
            }),
        }
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.data.ok,
      true
    );

    if (
      result.data.ok
    ) {
      assert.equal(
        result.data.network,
        "zcash"
      );

      assert.equal(
        result.data
          .balanceZatoshis,
        "500"
      );

      assert.equal(
        result.data
          .modules
          .addressState
          .status,
        "complete"
      );
    }
  }
);
