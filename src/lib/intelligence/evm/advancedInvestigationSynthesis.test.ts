import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmAdvancedInvestigationSynthesis,
} from "./advancedInvestigationSynthesis";

import type {
  EvmCoordinatedWalletBehavior,
} from "./coordinatedWalletBehavior";

import type {
  EvmDeepDeployerInvestigation,
} from "./deepDeployerInvestigation";

import type {
  EvmDeepFundingTracing,
} from "./deepFundingTracing";

import type {
  EvmWalletGraph,
} from "./walletGraph";

const ROOT =
  "0x1111111111111111111111111111111111111111";

const HASH_A =
  `0x${"a".repeat(64)}`;

const HASH_B =
  `0x${"b".repeat(64)}`;

const HASH_C =
  `0x${"c".repeat(64)}`;

const HASH_D =
  `0x${"d".repeat(64)}`;

test(
  "builds deterministic cross-module Advanced synthesis",
  () => {
    const result =
      analyzeEvmAdvancedInvestigationSynthesis({
        rootAddress:
          ROOT,

        deepFundingTracing: {
          pathCount: 2,
          maxDepthReached: 3,
          nodeCount: 5,
          edgeCount: 4,
          evidenceTransactionHashes: [
            HASH_B,
            HASH_A,
          ],
        } as unknown as
          EvmDeepFundingTracing,

        deepDeployerInvestigation: {
          verifiedDeploymentCount: 3,
          otherVerifiedDeploymentCount: 2,
          repeatedDeploymentActivity: true,
          evidenceTransactionHashes: [
            HASH_C,
            HASH_A,
          ],
          fundingContext: {
            fundingSourceCount: 4,
          },
          relationshipContext: {
            counterpartyCount: 7,
          },
        } as unknown as
          EvmDeepDeployerInvestigation,

        walletGraph: {
          nodeCount: 8,
          edgeCount: 9,
          maxDepthReached: 4,
          edges: [
            {
              evidenceTransactionHashes: [
                HASH_D,
                HASH_B,
              ],
            },
          ],
        } as unknown as
          EvmWalletGraph,

        coordination: {
          signalCount: 5,
          directSignalCount: 2,
          corroboratingSignalCount: 3,
          corroboratedSignalCount: 2,
          temporalCorrelationSignalCount: 1,
          multiHopPathCorroborationCount: 2,
          evidenceTransactionHashes: [
            HASH_D,
            HASH_C,
          ],
        } as unknown as
          EvmCoordinatedWalletBehavior,
      });

    assert.equal(
      result.sourceModuleCount,
      4
    );

    assert.equal(
      result.evidenceTransactionCount,
      4
    );

    assert.deepEqual(
      result.evidenceTransactionHashes,
      [
        HASH_A,
        HASH_B,
        HASH_C,
        HASH_D,
      ]
    );

    assert.deepEqual(
      result.highlights.map(
        item =>
          item.kind
      ),
      [
        "deep_funding",
        "deep_deployer",
        "wallet_graph",
        "coordination",
      ]
    );

    assert.equal(
      result.coverage
        .includesOwnershipInference,
      false
    );

    assert.equal(
      result.coverage
        .includesRiskScoring,
      false
    );
  }
);

test(
  "handles missing module evidence without inventing signals",
  () => {
    const result =
      analyzeEvmAdvancedInvestigationSynthesis({
        rootAddress:
          ROOT,
      });

    assert.equal(
      result.sourceModuleCount,
      0
    );

    assert.equal(
      result.evidenceTransactionCount,
      0
    );

    assert.deepEqual(
      result.highlights,
      []
    );
  }
);

test(
  "rejects invalid synthesis root address",
  () => {
    assert.throws(
      () =>
        analyzeEvmAdvancedInvestigationSynthesis({
          rootAddress:
            "not-an-address",
        }),
      /Invalid EVM synthesis root address/
    );
  }
);
