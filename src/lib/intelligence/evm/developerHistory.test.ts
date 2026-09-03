import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmDeveloperHistory,
  type EvmDeveloperDeploymentObservation,
  type EvmDeveloperHistoryCoverage,
} from "./developerHistory";

const target =
  "0x1111111111111111111111111111111111111111";

const other =
  "0x2222222222222222222222222222222222222222";

const deployer =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const wrongDeployer =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

const coverage:
  EvmDeveloperHistoryCoverage = {
  transactionHistorySource:
    "goldrush_transactions_v3",

  requestedMaxPages: 3,
  scannedPages: 2,
  historyExhausted: true,

  receiptCheckLimit: 12,
  receiptCheckLimited: false,

  receiptVerificationFailureCount:
    0,

  includesTopLevelCreate: true,
  includesInternalCreate: false,
  includesCreate2: false,

  limitation:
    "Test coverage.",
};

const targetDeployment:
  EvmDeveloperDeploymentObservation = {
  contractAddress:
    target,

  deployerAddress:
    deployer,

  transactionHash:
    hash("1"),

  blockNumber:
    100,

  timestamp:
    "2020-01-01T00:00:00Z",

  creationKind:
    "top_level_create",

  evidenceKind:
    "transaction_receipt",
};

test(
  "builds deterministic evidence-first developer history",
  () => {
    const result =
      analyzeEvmDeveloperHistory({
        targetContractAddress:
          target,

        targetDeployment,

        observedDeployments: [
          {
            contractAddress:
              other,

            deployerAddress:
              deployer,

            transactionHash:
              hash("2"),

            blockNumber:
              200,

            timestamp:
              "2021-01-01T00:00:00Z",

            creationKind:
              "top_level_create",

            evidenceKind:
              "transaction_receipt",
          },

          {
            ...targetDeployment,
          },

          {
            contractAddress:
              "0x3333333333333333333333333333333333333333",

            deployerAddress:
              wrongDeployer,

            transactionHash:
              hash("3"),

            blockNumber:
              300,

            timestamp:
              "2022-01-01T00:00:00Z",

            creationKind:
              "top_level_create",

            evidenceKind:
              "transaction_receipt",
          },
        ],

        coverage,
      });

    assert.equal(
      result.deployerAddress,
      deployer
    );

    assert.equal(
      result.verifiedDeploymentCount,
      2
    );

    assert.equal(
      result.otherVerifiedDeploymentCount,
      1
    );

    assert.equal(
      result.repeatedDeploymentActivity,
      true
    );

    assert.equal(
      result.duplicateEvidenceCount,
      1
    );

    assert.equal(
      result.ignoredEvidenceCount,
      1
    );

    assert.equal(
      result.firstDeployment
        ?.contractAddress,
      target
    );

    assert.equal(
      result.lastDeployment
        ?.contractAddress,
      other
    );

    assert.deepEqual(
      result.evidenceTransactionHashes,
      [
        hash("1"),
        hash("2"),
      ]
    );
  }
);

test(
  "rejects invalid target contract",
  () => {
    assert.throws(
      () =>
        analyzeEvmDeveloperHistory({
          targetContractAddress:
            "invalid",

          targetDeployment,

          observedDeployments: [],

          coverage,
        }),

      /Invalid target contract address/
    );
  }
);
