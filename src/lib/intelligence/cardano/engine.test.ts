import assert from "node:assert/strict";
import test from "node:test";

import {
  runCardanoIntelligence,
} from "./engine";

const ADDRESS =
  "addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8";

test(
  "rejects invalid Cardano address before provider work",
  async () => {
    let called =
      false;

    const result =
      await runCardanoIntelligence(
        {
          address:
            "invalid",
        },
        {
          async loadEvidence() {
            called =
              true;
            throw new Error(
              "must not run"
            );
          },
        }
      );

    assert.equal(
      result.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "runs Cardano deep intelligence",
  async () => {
    const result =
      await runCardanoIntelligence(
        {
          address:
            ADDRESS,
          analysisPlan:
            "pro",
        },
        {
          async loadEvidence(
            input
          ) {
            return {
              ok:
                true,
              providerId:
                "cardano-blockfrost",
              latencyMs:
                1,
              data: {
                addressState: {
                  address:
                    input.address,
                  stakeAddress:
                    null,
                  script:
                    false,
                  nativeBalanceLovelace:
                    "1000000",
                  assets:
                    [],
                },
                recentTransactions:
                  [],
                earliestTransactions:
                  [],
                utxos:
                  [],
                canonicalTransactions:
                  [],
                stake:
                  null,
                coverage: {
                  plan:
                    input.analysisPlan,
                  historyLimit:
                    36,
                  earliestHistoryLimit:
                    12,
                  utxoLimit:
                    36,
                  assetLimit:
                    36,
                  canonicalSampleLimit:
                    4,
                  canonicalRequested:
                    0,
                  canonicalVerified:
                    0,
                  canonicalUnavailable:
                    0,
                  historyHasMore:
                    false,
                  utxosHaveMore:
                    false,
                  providerRequestBudget:
                    16,
                  providerRequestsUsed:
                    3,
                  primaryProvider:
                    "cardano-blockfrost",
                  fallbackProvider:
                    null,
                  fallbackUsed:
                    false,
                },
              },
            };
          },
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
        "cardano"
      );

      assert.equal(
        result.data
          .analysisPlan,
        "pro"
      );
    }
  }
);
