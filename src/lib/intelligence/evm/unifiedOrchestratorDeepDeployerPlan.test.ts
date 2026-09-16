import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

const targetContract =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const deployer =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const targetDeploymentHash =
  `0x${"f".repeat(64)}`;

function success<T>(
  data: T,
  providerId:
    "alchemy" | "goldrush" =
      "goldrush"
) {
  return {
    ok: true as const,
    providerId,
    latencyMs: 1,
    data,
  };
}

function hashFor(
  ordinal: number
) {
  return (
    "0x" +
    ordinal
      .toString(16)
      .padStart(
        64,
        "0"
      )
  );
}

function contractFor(
  ordinal: number
) {
  return (
    "0x" +
    (
      ordinal +
      100
    )
      .toString(16)
      .padStart(
        40,
        "0"
      )
  );
}

async function runForPlan(
  analysisPlan:
    AnalysisDepthPlan
) {
  let deployerPageCalls = 0;
  let receiptCalls = 0;

  const deps:
    EvmUnifiedOrchestratorDependencies = {
    readTokenMetadata:
      async () =>
        success(
          {
            address:
              targetContract,

            name:
              null,

            symbol:
              null,

            decimals:
              null,

            totalSupply:
              null,

            isContract:
              true,

            isErc20:
              false,
          },
          "alchemy"
        ),

    getTokenHolders:
      async () => {
        throw new Error(
          "Holder provider must not run for non-ERC20 contract."
        );
      },

    getTransactions:
      async request => {
        const address =
          request.address
            .toLowerCase();

        if (
          address ===
          targetContract
        ) {
          return success({
            transactions: [],
            nextCursor:
              null,
          });
        }

        if (
          address !==
          deployer
        ) {
          return success({
            transactions: [],
            nextCursor:
              null,
          });
        }

        deployerPageCalls += 1;

        const page =
          request.cursor ===
            null
            ? 0
            : Number(
                request.cursor
              );

        const transactions =
          Array.from(
            {
              length: 3,
            },
            (
              _,
              index
            ) => {
              const ordinal =
                page * 3 +
                index +
                1;

              return {
                hash:
                  hashFor(
                    ordinal
                  ),

                blockNumber:
                  1_000 +
                  ordinal,

                timestamp:
                  new Date(
                    Date.UTC(
                      2026,
                      0,
                      1,
                      0,
                      ordinal,
                      0
                    )
                  ).toISOString(),

                from:
                  deployer,

                to:
                  null,

                value:
                  "0",
              };
            }
          );

        return success({
          transactions,

          nextCursor:
            page < 4
              ? String(
                  page + 1
                )
              : null,
        });
      },

    getTokenTransfers:
      async () => {
        throw new Error(
          "Transfer provider must not run for non-ERC20 contract."
        );
      },

    getContractDeployment:
      async () =>
        success(
          {
            contractAddress:
              targetContract,

            isContract:
              true,

            firstObservedCodeBlock:
              900,

            deployment: {
              contractAddress:
                targetContract,

              deployerAddress:
                deployer,

              transactionHash:
                targetDeploymentHash,

              blockNumber:
                900,

              timestamp:
                "2025-12-01T00:00:00Z",

              creationKind:
                "top_level_create",

              evidenceKind:
                "transaction_receipt",
            },

            coverage: {
              historicalCodeSearch:
                true,

              topLevelCreateReceipts:
                true,

              internalCreate:
                false,

              create2:
                false,

              limitation:
                "Internal CREATE and CREATE2 are not covered.",
            },
          },
          "alchemy"
        ),

    getTransactionReceipt:
      async request => {
        receiptCalls += 1;

        const ordinal =
          Number(
            BigInt(
              request
                .transactionHash
            )
          );

        return success(
          {
            transactionHash:
              request
                .transactionHash,

            blockNumber:
              1_000 +
              ordinal,

            from:
              deployer,

            to:
              null,

            contractAddress:
              contractFor(
                ordinal
              ),

            success:
              true,
          },
          "alchemy"
        );
      },
  };

  const result =
    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",

        address:
          targetContract,

        analysisPlan,
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

  if (!result.data.ok) {
    throw new Error(
      "Expected unified EVM success."
    );
  }

  const developer =
    result.data.modules
      .developerHistory
      .data as {
        coverage: {
          requestedMaxPages:
            number;

          scannedPages:
            number;

          receiptCheckLimit:
            number;

          receiptCheckLimited:
            boolean;
        };

        deepDeployerInvestigation:
          | {
              verifiedDeploymentCount:
                number;

              targetDeploymentRank:
                number | null;

              verifiedDeploymentsBeforeTargetCount:
                number;

              verifiedDeploymentsAfterTargetCount:
                number;

              chronology:
                readonly unknown[];

              fundingContext:
                {
                  fundingSourceCount:
                    number;
                } | null;

              relationshipContext:
                {
                  counterpartyCount:
                    number;
                } | null;
            }
          | null;
      };

  return {
    developer,
    deployerPageCalls,
    receiptCalls,
  };
}

test(
  "free keeps bounded developer-history scan at 2 pages / 8 receipt limit",
  async () => {
    const result =
      await runForPlan(
        "free"
      );

    assert.equal(
      result.deployerPageCalls,
      2
    );

    assert.equal(
      result.receiptCalls,
      6
    );

    assert.equal(
      result.developer
        .coverage
        .requestedMaxPages,
      2
    );

    assert.equal(
      result.developer
        .coverage
        .scannedPages,
      2
    );

    assert.equal(
      result.developer
        .coverage
        .receiptCheckLimit,
      8
    );

    assert.equal(
      result.developer
        .coverage
        .receiptCheckLimited,
      false
    );

    assert.equal(
      result.developer
        .deepDeployerInvestigation,
      null
    );
  }
);

test(
  "pro preserves the existing 2 page / 8 receipt developer-history envelope",
  async () => {
    const result =
      await runForPlan(
        "pro"
      );

    assert.equal(
      result.deployerPageCalls,
      2
    );

    assert.equal(
      result.receiptCalls,
      6
    );

    assert.equal(
      result.developer
        .coverage
        .requestedMaxPages,
      2
    );

    assert.equal(
      result.developer
        .coverage
        .receiptCheckLimit,
      8
    );

    assert.equal(
      result.developer
        .deepDeployerInvestigation,
      null
    );
  }
);

test(
  "advanced expands developer-history discovery to 5 pages / 12 receipt checks",
  async () => {
    const result =
      await runForPlan(
        "advanced"
      );

    assert.equal(
      result.deployerPageCalls,
      5
    );

    assert.equal(
      result.receiptCalls,
      12
    );

    assert.equal(
      result.developer
        .coverage
        .requestedMaxPages,
      5
    );

    assert.equal(
      result.developer
        .coverage
        .scannedPages,
      5
    );

    assert.equal(
      result.developer
        .coverage
        .receiptCheckLimit,
      12
    );

    assert.equal(
      result.developer
        .coverage
        .receiptCheckLimited,
      true
    );

    const deep =
      result.developer
        .deepDeployerInvestigation;

    assert.ok(deep);

    assert.equal(
      deep.verifiedDeploymentCount,
      13
    );

    assert.equal(
      deep.targetDeploymentRank,
      1
    );

    assert.equal(
      deep.verifiedDeploymentsBeforeTargetCount,
      0
    );

    assert.equal(
      deep.verifiedDeploymentsAfterTargetCount,
      12
    );

    assert.equal(
      deep.chronology.length,
      13
    );

    assert.ok(
      deep.fundingContext
    );

    assert.ok(
      deep.relationshipContext
    );

    assert.equal(
      typeof deep
        .fundingContext
        .fundingSourceCount,
      "number"
    );

    assert.equal(
      typeof deep
        .relationshipContext
        .counterpartyCount,
      "number"
    );
  }
);
