import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

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
  c: string
) =>
  `0x${c.repeat(64)}`;

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

function tx(
  id: string,
  from: string,
  to: string,
  value: string,
  blockNumber: number
): EvmTransaction {
  return {
    hash:
      hash(id),

    blockNumber,

    timestamp:
      `2026-01-01T00:0${blockNumber}:00Z`,

    from,
    to,
    value,
  };
}

function deps(
  calls: string[]
): EvmUnifiedOrchestratorDependencies {
  return {
    readTokenMetadata:
      async () =>
        success(
          {
            address:
              root,
            name: null,
            symbol: null,
            decimals: null,
            totalSupply: null,
            isContract: false,
            isErc20: false,
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

        const cursor =
          request.cursor ??
          "";

        calls.push(
          `${address}:${cursor}`
        );

        if (
          address === root &&
          cursor === ""
        ) {
          return success({
            transactions: [
              tx(
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
          address === sourceA &&
          cursor === ""
        ) {
          return success({
            transactions: [
              tx(
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
          nextCursor: null,
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
  plan: AnalysisDepthPlan,
  calls: string[]
) {
  const result =
    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",
        address:
          root,
        analysisPlan:
          plan,
      },
      deps(calls)
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
      "Expected success."
    );
  }

  return result.data;
}

type FundingData = {
  deepFundingTracing:
    | null
    | {
        nodeCount:
          number;

        maxDepthReached:
          number;

        evidenceTransactionHashes:
          readonly string[];

        coverage: {
          includesErc20Transfers:
            false;

          includesOwnershipInference:
            false;

          includesUltimateOriginInference:
            false;
        };
      };
};

test(
  "Free and Pro do not run Advanced Deep Funding",
  async () => {
    for (
      const plan of
        [
          "free",
          "pro",
        ] as const
    ) {
      const calls:
        string[] = [];

      const data =
        await runPlan(
          plan,
          calls
        );

      const funding =
        data.modules
          .fundingProvenance
          .data as FundingData;

      assert.equal(
        funding
          .deepFundingTracing,
        null
      );

      assert.equal(
        calls.some(
          call =>
            call.startsWith(
              `${sourceB}:`
            )
        ),
        false
      );
    }
  }
);

test(
  "Advanced traces upstream funding and reuses transaction cache",
  async () => {
    const calls:
      string[] = [];

    const data =
      await runPlan(
        "advanced",
        calls
      );

    const fundingModule =
      data.modules
        .fundingProvenance;

    const funding =
      fundingModule
        .data as FundingData;

    const deep =
      funding
        .deepFundingTracing;

    assert.ok(deep);

    assert.equal(
      deep.maxDepthReached,
      2
    );

    assert.equal(
      deep.nodeCount,
      3
    );

    assert.deepEqual(
      deep
        .evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
      ]
    );

    assert.equal(
      deep.coverage
        .includesErc20Transfers,
      false
    );

    assert.equal(
      deep.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      deep.coverage
        .includesUltimateOriginInference,
      false
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${root}:`
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${sourceA}:`
      ).length,
      1
    );

    assert.equal(
      calls.filter(
        call =>
          call ===
          `${sourceB}:`
      ).length,
      1
    );

    assert.equal(
      data.findings.some(
        finding =>
          finding.id ===
          "evm-deep-funding-paths-observed"
      ),
      true
    );
  }
);
