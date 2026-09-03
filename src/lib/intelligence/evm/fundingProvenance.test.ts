import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmFundingProvenance,
  FULL_FUNDING_COVERAGE,
  type EvmFundingObservation,
} from "./fundingProvenance";

const wallet =
  "0x1111111111111111111111111111111111111111";

const sourceA =
  "0x2222222222222222222222222222222222222222";

const sourceB =
  "0x3333333333333333333333333333333333333333";

const unrelated =
  "0x4444444444444444444444444444444444444444";

const tokenA =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const tokenB =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const hash = (value: string) =>
  `0x${value.repeat(64)}`;

test("builds deterministic evidence-first funding provenance", () => {
  const observations:
    EvmFundingObservation[] = [
    {
      kind: "evm_transaction",
      transactionHash: hash("1"),
      blockNumber: 1,
      timestamp:
        "2026-01-02T00:00:00Z",
      from: sourceA,
      to: wallet,
      rawValue: "100",
    },

    {
      kind: "erc20_transfer",
      transactionHash: hash("2"),
      blockNumber: 2,
      timestamp:
        "2026-01-03T00:00:00Z",
      from: sourceA,
      to: wallet,
      tokenAddress: tokenA,
      rawValue: "200",
    },

    {
      kind: "erc20_transfer",
      transactionHash: hash("2"),
      blockNumber: 2,
      timestamp:
        "2026-01-03T00:00:00Z",
      from: sourceA,
      to: wallet,
      tokenAddress: tokenB,
      rawValue: "300",
    },

    {
      kind: "evm_transaction",
      transactionHash: hash("3"),
      blockNumber: 3,
      timestamp:
        "2026-01-01T00:00:00Z",
      from: sourceB,
      to: wallet,
      rawValue: "50",
    },

    {
      kind: "evm_transaction",
      transactionHash: hash("4"),
      blockNumber: 4,
      timestamp:
        "2026-01-04T00:00:00Z",
      from: wallet,
      to: wallet,
      rawValue: "10",
    },

    {
      kind: "evm_transaction",
      transactionHash: hash("5"),
      blockNumber: 5,
      timestamp:
        "2026-01-05T00:00:00Z",
      from: unrelated,
      to: sourceA,
      rawValue: "20",
    },

    {
      kind: "evm_transaction",
      transactionHash: hash("6"),
      blockNumber: 6,
      timestamp:
        "2026-01-06T00:00:00Z",
      from: sourceB,
      to: wallet,
      rawValue: "0",
    },
  ];

  const result =
    analyzeEvmFundingProvenance({
      walletAddress: wallet,
      observations,
      coverage:
        FULL_FUNDING_COVERAGE,
    });

  assert.equal(
    result.fundingObservationCount,
    4
  );

  assert.equal(
    result.uniqueFundingTransactionCount,
    3
  );

  assert.equal(
    result.nativeFundingObservationCount,
    2
  );

  assert.equal(
    result.erc20FundingObservationCount,
    2
  );

  assert.equal(
    result.selfFundingObservationCount,
    1
  );

  assert.equal(
    result.ignoredEvidenceCount,
    2
  );

  assert.equal(
    result.fundingSourceCount,
    2
  );

  const a =
    result.sources.find(
      source =>
        source.sourceAddress ===
        sourceA
    );

  const b =
    result.sources.find(
      source =>
        source.sourceAddress ===
        sourceB
    );

  assert.ok(a);
  assert.ok(b);

  assert.equal(
    a.repeatedFundingSource,
    true
  );

  assert.equal(
    a.evidenceTransactionCount,
    2
  );

  assert.deepEqual(
    a.evidenceTransactionHashes,
    [
      hash("1"),
      hash("2"),
    ]
  );

  assert.deepEqual(
    a.observedTokenAddresses,
    [
      tokenA,
      tokenB,
    ]
  );

  assert.equal(
    a.nativeRawValue,
    "100"
  );

  assert.equal(
    a.attribution.label,
    null
  );

  assert.equal(
    result.firstObservedFunding
      ?.sourceAddress,
    sourceB
  );

  assert.equal(
    result.firstObservedFunding
      ?.transactionHash,
    hash("3")
  );

  assert.equal(
    result.firstSeen,
    "2026-01-01T00:00:00Z"
  );

  assert.equal(
    result.lastSeen,
    "2026-01-03T00:00:00Z"
  );
});

test("rejects invalid focal wallet", () => {
  assert.throws(
    () =>
      analyzeEvmFundingProvenance({
        walletAddress: "invalid",
        observations: [],
        coverage:
          FULL_FUNDING_COVERAGE,
      }),
    /Invalid EVM wallet address/
  );
});
