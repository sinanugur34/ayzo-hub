import assert from "node:assert/strict";
import test from "node:test";

import {
  runStellarIntelligence,
  type StellarEngineDependencies,
} from "./engine";

const ACCOUNT =
  "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ";

const deps:
  StellarEngineDependencies = {
    async loadEvidence(
      input
    ) {
      return {
        ok:
          true,

        providerId:
          "stellar-horizon",

        latencyMs:
          1,

        data: {
          account: {
            id:
              input.address,

            sequence:
              "1",

            subentryCount:
              0,

            inflationDestination:
              null,

            homeDomain:
              null,

            lastModifiedLedger:
              null,

            lastModifiedTime:
              null,

            thresholds: {
              low:
                1,

              medium:
                1,

              high:
                1,
            },

            flags: {
              authRequired:
                false,

              authRevocable:
                false,

              authImmutable:
                false,

              authClawbackEnabled:
                false,
            },

            balances: [
              {
                assetType:
                  "native",

                assetCode:
                  null,

                assetIssuer:
                  null,

                balance:
                  "1.0000000",

                limit:
                  null,

                authorized:
                  null,

                authorizedToMaintainLiabilities:
                  null,

                clawbackEnabled:
                  null,
              },
            ],

            signers:
              [],
          },

          transactions:
            [],

          payments:
            [],

          earliestPayments:
            [],

          operations:
            [],

          offers:
            [],

          trades:
            [],

          coverage: {
            plan:
              input
                .analysisPlan,

            transactionLimit:
              8,

            paymentLimit:
              8,

            earliestPaymentLimit:
              4,

            operationLimit:
              8,

            offerLimit:
              8,

            tradeLimit:
              8,

            provider:
              "stellar-horizon",
          },
        },
      };
    },
  };

test(
  "runs Stellar native intelligence",
  async () => {
    const result =
      await runStellarIntelligence(
        {
          address:
            ACCOUNT,

          analysisPlan:
            "pro",
        },

        deps
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
        "stellar"
      );
    }
  }
);
