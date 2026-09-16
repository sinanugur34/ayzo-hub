import assert from "node:assert/strict";
import test from "node:test";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  EvmTransaction,
} from "./types";

const root =
  "0x1111111111111111111111111111111111111111";

const sourceA =
  "0x2222222222222222222222222222222222222222";

const sourceB =
  "0x3333333333333333333333333333333333333333";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

function success<T>(
  data: T,
  providerId:
    "goldrush" | "alchemy" =
      "goldrush"
) {
  return {
    ok: true as const,

    providerId,

    latencyMs: 1,

    data,
  };
}

function transaction(
  character: string,
  from: string,
  to: string,
  value: string,
  blockNumber: number
): EvmTransaction {
  return {
    hash:
      hash(character),

    blockNumber,

    timestamp:
      `2026-01-01T00:0${blockNumber}:00Z`,

    from,
    to,
    value,
  };
}

function dependencies():
  EvmUnifiedOrchestratorDependencies {
  return {
    readTokenMetadata:
      async () =>
        success(
          {
            address:
              root,

            name:
              null,

            symbol:
              null,

            decimals:
              null,

            totalSupply:
              null,

            isContract:
              false,

            isErc20:
              false,
          },
          "alchemy"
        ),

    getTokenHolders:
      async () => {
        throw new Error(
          "Holder provider should not run."
        );
      },

    getTransactions:
      async request => {
        const address =
          request.address
            .toLowerCase();

        if (
          address ===
          root
        ) {
          return success({
            transactions: [
              transaction(
                "1",
                sourceA,
                root,
                "100",
                1
              ),
            ],

            nextCursor:
              null,
          });
        }

        if (
          address ===
          sourceA
        ) {
          return success({
            transactions: [
              transaction(
                "2",
                sourceB,
                sourceA,
                "200",
                2
              ),
            ],

            nextCursor:
              null,
          });
        }

        return success({
          transactions: [],

          nextCursor:
            null,
        });
      },

    getTokenTransfers:
      async () => {
        throw new Error(
          "Transfer provider should not run."
        );
      },

    getContractDeployment:
      async () => {
        throw new Error(
          "Deployment provider should not run."
        );
      },

    getTransactionReceipt:
      async () => {
        throw new Error(
          "Receipt provider should not run."
        );
      },
  };
}

async function runPlan(
  analysisPlan:
    AnalysisDepthPlan
) {
  const result =
    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",

        address:
          root,

        analysisPlan,
      },
      dependencies()
    );

  assert.equal(
    result.status,
    200
  );

  assert.equal(
    result.data.ok,
    true
  );

  if (!result.data.ok) {
    throw new Error(
      "Expected successful intelligence result."
    );
  }

  return result.data;
}

test(
  "Free and Pro do not receive Advanced Investigation Synthesis",
  async () => {
    for (
      const plan of [
        "free",
        "pro",
      ] as const
    ) {
      const result =
        await runPlan(
          plan
        );

      assert.equal(
        result
          .advancedInvestigationSynthesis,
        null
      );
    }
  }
);

test(
  "Advanced receives cross-module Investigation Synthesis",
  async () => {
    const result =
      await runPlan(
        "advanced"
      );

    const synthesis =
      result
        .advancedInvestigationSynthesis;

    assert.ok(
      synthesis
    );

    assert.equal(
      synthesis.schemaVersion,
      1
    );

    assert.equal(
      synthesis.rootAddress,
      root
    );

    assert.equal(
      synthesis.funding.available,
      true
    );

    assert.equal(
      synthesis.graph.available,
      true
    );

    assert.equal(
      synthesis.coordination.available,
      true
    );

    assert.equal(
      synthesis.deployer.available,
      false
    );

    assert.ok(
      synthesis.sourceModuleCount >=
        3
    );

    assert.equal(
      synthesis.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      synthesis.coverage
        .includesRiskScoring,
      false
    );
  }
);
