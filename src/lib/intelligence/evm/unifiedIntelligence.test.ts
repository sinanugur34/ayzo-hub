import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvmUnifiedIntelligence,
  EVM_UNIFIED_MODULE_IDS,
  type EvmUnifiedModuleResult,
} from "./unifiedIntelligence";

const network = {
  networkId:
    "ethereum" as const,

  name:
    "Ethereum",

  chainId:
    1,

  nativeCurrency:
    "ETH",
};

const address =
  "0x1111111111111111111111111111111111111111";

function complete(
  data: unknown = {}
): EvmUnifiedModuleResult {
  return {
    status:
      "complete",

    data,

    error:
      null,

    limitation:
      null,
  };
}

test(
  "builds full unified intelligence when every module is complete",
  () => {
    const modules =
      Object.fromEntries(
        EVM_UNIFIED_MODULE_IDS.map(
          moduleId => [
            moduleId,
            complete({
              moduleId,
            }),
          ]
        )
      );

    const result =
      buildEvmUnifiedIntelligence({
        network,

        address:
          address.toUpperCase(),

        assetKind:
          "erc20_contract",

        modules,

        findings: [
          {
            id:
              "holder-concentration",

            category:
              "holders",

            title:
              "Holder concentration observed",

            severity:
              "attention",

            confidence:
              "high",

            summary:
              "Concentration evidence was observed.",

            caveat:
              "This is not a trading recommendation.",
          },
        ],
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.engine,
      "evm"
    );

    assert.equal(
      result.address,
      address
    );

    assert.equal(
      result.coverage,
      "full"
    );

    assert.equal(
      result.moduleSummary
        .complete,
      EVM_UNIFIED_MODULE_IDS
        .length
    );

    assert.equal(
      result.moduleSummary
        .limited,
      0
    );

    assert.equal(
      result.moduleSummary
        .notRun,
      0
    );

    assert.equal(
      result.network.family,
      "evm"
    );

    assert.equal(
      result.network.chainId,
      1
    );
  }
);

test(
  "builds partial intelligence and preserves explicit coverage limitations",
  () => {
    const result =
      buildEvmUnifiedIntelligence({
        network,

        address,

        assetKind:
          "contract",

        modules: {
          assetVerification:
            complete({
              isContract:
                true,
            }),

          holderIntelligence: {
            status:
              "limited",

            data: {
              analyzed:
                100,
            },

            error:
              null,

            limitation:
              "Only the first holder page was analyzed.",
          },

          developerHistory: {
            status:
              "unavailable",

            data: {
              shouldDisappear:
                true,
            },

            error:
              "Deployment evidence unavailable.",

            limitation:
              "Internal CREATE is not covered.",
          },
        },

        caveats: [
          "Evidence describes observed on-chain activity only.",
          "Evidence describes observed on-chain activity only.",
        ],

        findings: [
          {
            id:
              "b",

            category:
              "graph",

            title:
              "Observed relationship",

            severity:
              "informational",

            confidence:
              "medium",

            summary:
              "A relationship was observed.",

            caveat:
              "Ownership is not inferred.",
          },

          {
            id:
              "a",

            category:
              "deployment",

            title:
              "Deployment evidence",

            severity:
              "attention",

            confidence:
              "high",

            summary:
              "Deployment evidence was observed.",

            caveat:
              "Deployer does not imply current owner.",
          },

          // Duplicate id must be ignored.
          {
            id:
              "a",

            category:
              "duplicate",

            title:
              "Duplicate",

            severity:
              "informational",

            confidence:
              "low",

            summary:
              "Duplicate.",

            caveat:
              "Duplicate.",
          },
        ],
      });

    assert.equal(
      result.coverage,
      "partial"
    );

    assert.equal(
      result.moduleSummary
        .complete,
      1
    );

    assert.equal(
      result.moduleSummary
        .limited,
      1
    );

    assert.equal(
      result.moduleSummary
        .unavailable,
      1
    );

    assert.equal(
      result.moduleSummary
        .notRun,
      EVM_UNIFIED_MODULE_IDS
        .length - 3
    );

    assert.equal(
      result.modules
        .developerHistory
        .data,
      null
    );

    assert.deepEqual(
      result.findings.map(
        finding =>
          finding.id
      ),
      [
        "a",
        "b",
      ]
    );

    assert.deepEqual(
      result.caveats,
      [
        "Evidence describes observed on-chain activity only.",
        "Internal CREATE is not covered.",
        "Only the first holder page was analyzed.",
      ]
    );
  }
);

test(
  "rejects invalid address and invalid network context",
  () => {
    assert.throws(
      () =>
        buildEvmUnifiedIntelligence({
          network,

          address:
            "invalid",

          assetKind:
            "wallet",

          modules: {},
        }),

      /Invalid EVM intelligence address/
    );

    assert.throws(
      () =>
        buildEvmUnifiedIntelligence({
          network: {
            ...network,
            chainId: 0,
          },

          address,

          assetKind:
            "wallet",

          modules: {},
        }),

      /Invalid EVM network context/
    );
  }
);
