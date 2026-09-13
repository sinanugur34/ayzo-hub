import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  EvmTransaction,
} from "./types";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

const wallet =
  "0x1111111111111111111111111111111111111111";

const counterparty =
  "0x2222222222222222222222222222222222222222";

const hash = (
  character:
    string
) =>
  `0x${character.repeat(64)}`;

function success<T>(
  data:
    T,
  providerId:
    "alchemy" | "goldrush" =
      "goldrush"
) {
  return {
    ok:
      true as const,

    providerId,

    latencyMs:
      1,

    data,
  };
}

const rootTransactions:
  EvmTransaction[] = [
    {
      hash:
        hash("1"),

      blockNumber:
        100,

      timestamp:
        "2026-09-01T00:00:00Z",

      from:
        counterparty,

      to:
        wallet,

      value:
        "100",
    },

    {
      hash:
        hash("2"),

      blockNumber:
        101,

      timestamp:
        "2026-09-02T00:00:00Z",

      from:
        wallet,

      to:
        counterparty,

      value:
        "25",
    },
  ];

function createDependencies():
  EvmUnifiedOrchestratorDependencies {
  return {
    readTokenMetadata:
      async () =>
        success(
          {
            address:
              wallet,

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
          "Holder provider should not run for a wallet."
        );
      },

    getTransactions:
      async request => {
        if (
          request.address
            .toLowerCase() ===
          wallet
        ) {
          return success({
            transactions:
              rootTransactions,

            nextCursor:
              null,
          });
        }

        return success({
          transactions:
            [],

          nextCursor:
            null,
        });
      },

    getTokenTransfers:
      async () => {
        throw new Error(
          "Transfer provider should not run for a non-ERC20 wallet."
        );
      },

    getContractDeployment:
      async () => {
        throw new Error(
          "Deployment provider should not run for a wallet."
        );
      },

    getTransactionReceipt:
      async () => {
        throw new Error(
          "Receipt provider should not run for a wallet."
        );
      },
  };
}

async function run(
  analysisPlan:
    AnalysisDepthPlan
) {
  const result =
    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",

        address:
          wallet,

        analysisPlan,
      },
      createDependencies()
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
      "Expected unified EVM success."
    );
  }

  return result.data;
}

test(
  "Free does not receive Market Flow Intelligence",
  async () => {
    const data =
      await run(
        "free"
      );

    const marketFlowModule =
      data.modules
        .marketFlowIntelligence;

    assert.equal(
      marketFlowModule.status,
      "not-run"
    );

    assert.equal(
      marketFlowModule.data,
      null
    );

    assert.match(
      marketFlowModule.limitation ??
        "",
      /Pro or Advanced/
    );

    assert.equal(
      data.findings.some(
        finding =>
          finding.id ===
          "evm-market-flow-observed"
      ),
      false
    );
  }
);

for (
  const plan of
    [
      "pro",
      "advanced",
    ] as const
) {
  test(
    `${plan} receives evidence-backed Market Flow Intelligence`,
    async () => {
      const data =
        await run(
          plan
        );

      const marketFlowModule =
        data.modules
          .marketFlowIntelligence;

      assert.equal(
        marketFlowModule.status,
        "limited"
      );

      assert.ok(
        marketFlowModule.data
      );

      const flow =
        marketFlowModule.data as {
          schemaVersion:
            number;

          dominantDirection:
            string;

          incomingObservationCount:
            number;

          outgoingObservationCount:
            number;

          totalDirectionalObservationCount:
            number;

          uniqueCounterpartyCount:
            number;

          counterparties:
            readonly {
              address:
                string;
            }[];

          methodology:
            string;

          limitation:
            string;
        };

      assert.equal(
        flow.schemaVersion,
        1
      );

      assert.equal(
        flow.dominantDirection,
        "balanced"
      );

      assert.equal(
        flow.incomingObservationCount,
        1
      );

      assert.equal(
        flow.outgoingObservationCount,
        1
      );

      assert.equal(
        flow.totalDirectionalObservationCount,
        2
      );

      assert.equal(
        flow.uniqueCounterpartyCount,
        1
      );

      assert.equal(
        flow.counterparties[0]
          ?.address,
        counterparty
      );

      assert.match(
        flow.methodology,
        /evidence observations/
      );

      assert.match(
        flow.limitation,
        /analysis window|bounded/
      );

      assert.equal(
        data.findings.some(
          finding =>
            finding.id ===
            "evm-market-flow-observed"
        ),
        true
      );
    }
  );
}
