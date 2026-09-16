import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmDeepDeployerInvestigation,
} from "./deepDeployerInvestigation";

import type {
  EvmDeveloperHistory,
} from "./developerHistory";

const deployer =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const contractA =
  "0x1111111111111111111111111111111111111111";

const target =
  "0x2222222222222222222222222222222222222222";

const contractC =
  "0x3333333333333333333333333333333333333333";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

const history:
  EvmDeveloperHistory = {
  targetContractAddress:
    target,

  deployerAddress:
    deployer,

  verifiedDeploymentCount:
    3,

  otherVerifiedDeploymentCount:
    2,

  repeatedDeploymentActivity:
    true,

  duplicateEvidenceCount:
    0,

  ignoredEvidenceCount:
    0,

  firstDeployment:
    {
      rank: 1,

      contractAddress:
        contractA,

      deployerAddress:
        deployer,

      transactionHash:
        hash("1"),

      blockNumber:
        100,

      timestamp:
        "2024-01-01T00:00:00Z",

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",

      isTargetContract:
        false,
    },

  lastDeployment:
    {
      rank: 3,

      contractAddress:
        contractC,

      deployerAddress:
        deployer,

      transactionHash:
        hash("3"),

      blockNumber:
        300,

      timestamp:
        "2026-01-01T00:00:00Z",

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",

      isTargetContract:
        false,
    },

  evidenceTransactionHashes: [
    hash("1"),
    hash("2"),
    hash("3"),
  ],

  deployments: [
    {
      rank: 1,

      contractAddress:
        contractA,

      deployerAddress:
        deployer,

      transactionHash:
        hash("1"),

      blockNumber:
        100,

      timestamp:
        "2024-01-01T00:00:00Z",

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",

      isTargetContract:
        false,
    },

    {
      rank: 2,

      contractAddress:
        target,

      deployerAddress:
        deployer,

      transactionHash:
        hash("2"),

      blockNumber:
        200,

      timestamp:
        "2025-01-01T00:00:00Z",

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",

      isTargetContract:
        true,
    },

    {
      rank: 3,

      contractAddress:
        contractC,

      deployerAddress:
        deployer,

      transactionHash:
        hash("3"),

      blockNumber:
        300,

      timestamp:
        "2026-01-01T00:00:00Z",

      creationKind:
        "top_level_create",

      evidenceKind:
        "transaction_receipt",

      isTargetContract:
        false,
    },
  ],

  coverage: {
    transactionHistorySource:
      "goldrush_transactions_v3",

    requestedMaxPages:
      5,

    scannedPages:
      5,

    historyExhausted:
      false,

    receiptCheckLimit:
      12,

    receiptCheckLimited:
      false,

    receiptVerificationFailureCount:
      0,

    includesTopLevelCreate:
      true,

    includesInternalCreate:
      false,

    includesCreate2:
      false,

    limitation:
      "Bounded test history.",
  },
};

test(
  "builds deterministic advanced deployer chronology",
  () => {
    const result =
      analyzeEvmDeepDeployerInvestigation({
        developerHistory:
          history,
      });

    assert.equal(
      result.schemaVersion,
      1
    );

    assert.equal(
      result.deployerAddress,
      deployer
    );

    assert.equal(
      result.verifiedDeploymentCount,
      3
    );

    assert.equal(
      result.targetDeploymentRank,
      2
    );

    assert.equal(
      result.verifiedDeploymentsBeforeTargetCount,
      1
    );

    assert.equal(
      result.verifiedDeploymentsAfterTargetCount,
      1
    );

    assert.equal(
      result.timestampedDeploymentCount,
      3
    );

    assert.equal(
      result.firstObservedAt,
      "2024-01-01T00:00:00Z"
    );

    assert.equal(
      result.lastObservedAt,
      "2026-01-01T00:00:00Z"
    );

    assert.ok(
      typeof result
        .observedDeploymentSpanSeconds ===
        "number"
    );

    assert.equal(
      result.firstDeployment
        ?.contractAddress,
      contractA
    );

    assert.equal(
      result.lastDeployment
        ?.contractAddress,
      contractC
    );

    assert.deepEqual(
      result.chronology.map(
        deployment =>
          deployment
            .contractAddress
      ),
      [
        contractA,
        target,
        contractC,
      ]
    );

    assert.equal(
      result.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      result.coverage
        .includesIdentityInference,
      false
    );

    assert.equal(
      result.coverage
        .includesIntentInference,
      false
    );
  }
);

test(
  "keeps chronology evidence usable when timestamps are missing",
  () => {
    const result =
      analyzeEvmDeepDeployerInvestigation({
        developerHistory: {
          ...history,

          deployments:
            history.deployments.map(
              deployment => ({
                ...deployment,
                timestamp:
                  null,
              })
            ),
        },
      });

    assert.equal(
      result.timestampedDeploymentCount,
      0
    );

    assert.equal(
      result.firstObservedAt,
      null
    );

    assert.equal(
      result.lastObservedAt,
      null
    );

    assert.equal(
      result.observedDeploymentSpanSeconds,
      null
    );

    assert.equal(
      result.chronology.length,
      3
    );
  }
);

test(
  "preserves bounded funding and relationship context",
  () => {
    const result =
      analyzeEvmDeepDeployerInvestigation({
        developerHistory:
          history,

        fundingContext: {
          fundingObservationCount:
            2,

          uniqueFundingTransactionCount:
            2,

          fundingSourceCount:
            1,

          repeatedFundingSourceCount:
            1,

          firstSeen:
            "2023-01-01T00:00:00Z",

          lastSeen:
            "2023-02-01T00:00:00Z",

          firstObservedFunding: {
            sourceAddress:
              "0x4444444444444444444444444444444444444444",

            transactionHash:
              hash("4"),

            timestamp:
              "2023-01-01T00:00:00Z",

            rawValue:
              "100",
          },

          strongestSources: [
            {
              rank: 1,

              sourceAddress:
                "0x4444444444444444444444444444444444444444",

              fundingObservationCount:
                2,

              evidenceTransactionCount:
                2,

              nativeRawValue:
                "200",

              firstSeen:
                "2023-01-01T00:00:00Z",

              lastSeen:
                "2023-02-01T00:00:00Z",

              repeatedFundingSource:
                true,

              evidenceTransactionHashes: [
                hash("4"),
                hash("5"),
              ],
            },
          ],

          limitation:
            "Transaction-only funding coverage.",
        },

        relationshipContext: {
          interactionCount:
            3,

          incomingInteractionCount:
            1,

          outgoingInteractionCount:
            2,

          transactionCount:
            3,

          counterpartyCount:
            1,

          firstSeen:
            "2023-01-01T00:00:00Z",

          lastSeen:
            "2023-03-01T00:00:00Z",

          strongestCounterparties: [
            {
              rank: 1,

              counterparty:
                "0x5555555555555555555555555555555555555555",

              direction:
                "bidirectional",

              interactionCount:
                3,

              incomingInteractionCount:
                1,

              outgoingInteractionCount:
                2,

              transactionCount:
                3,

              firstSeen:
                "2023-01-01T00:00:00Z",

              lastSeen:
                "2023-03-01T00:00:00Z",

              evidenceTransactionHashes: [
                hash("6"),
              ],
            },
          ],

          limitation:
            "Transaction-only relationship coverage.",
        },
      });

    assert.equal(
      result.coverage
        .includesFundingContext,
      true
    );

    assert.equal(
      result.coverage
        .includesRelationshipContext,
      true
    );

    assert.equal(
      result.fundingContext
        ?.fundingSourceCount,
      1
    );

    assert.equal(
      result.fundingContext
        ?.strongestSources[0]
        ?.repeatedFundingSource,
      true
    );

    assert.equal(
      result.relationshipContext
        ?.counterpartyCount,
      1
    );

    assert.equal(
      result.relationshipContext
        ?.strongestCounterparties[0]
        ?.direction,
      "bidirectional"
    );
  }
);
