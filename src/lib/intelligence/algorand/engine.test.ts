import assert from "node:assert/strict";
import test from "node:test";

import {
  runAlgorandIntelligence,
} from "./engine";

import type {
  AlgorandEvidence,
} from "./types";

const ROOT =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

test(
  "rejects invalid Algorand address before provider work",
  async () => {
    let calls =
      0;

    const result =
      await runAlgorandIntelligence(
        {
          address:
            "not-an-algorand-address",
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
  "runs Algorand native Deep Analyze from explicit provider evidence",
  async () => {
    const evidence:
      AlgorandEvidence = {
        network:
          "algorand",

        address:
          ROOT,

        analysisPlan:
          "free",

        amountMicroAlgos:
          "1000",

        minBalanceMicroAlgos:
          "100000",

        authAddress:
          null,

        totalAssetsOptedIn:
          0,

        totalAppsOptedIn:
          0,

        assets:
          [],

        createdAssets:
          [],

        appLocalStates:
          [],

        createdApplications:
          [],

        transactions:
          [],

        coverage: {
          plan:
            "free",

          transactionLimit:
            20,

          assetLimit:
            24,

          createdAssetLimit:
            12,

          applicationLimit:
            16,

          providerRequestBudget:
            14,

          providerRequestsUsed:
            6,

          historyHasMore:
            false,

          assetsHaveMore:
            false,

          createdAssetsHaveMore:
            false,

          appLocalStateHasMore:
            false,

          createdAppsHaveMore:
            false,

          transportFailoverUsed:
            false,

          unavailableEvidence:
            [],

          coverage:
            "complete",
        },
      };

    const result =
      await runAlgorandIntelligence(
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
                "algorand-nodely",

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
        result.data
          .network,
        "algorand"
      );

      assert.equal(
        result.data
          .account
          .amountMicroAlgos,
        "1000"
      );

      assert.equal(
        result.data
          .modules
          .accountState
          .status,
        "complete"
      );
    }
  }
);
