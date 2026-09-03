import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEvmWalletRelationships,
  ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE,
  type EvmRelationshipObservation,
} from "./walletRelationships";

const wallet =
  "0x1111111111111111111111111111111111111111";

const a =
  "0x2222222222222222222222222222222222222222";

const b =
  "0x3333333333333333333333333333333333333333";

const c =
  "0x4444444444444444444444444444444444444444";

const dead =
  "0x000000000000000000000000000000000000dead";

const unrelated =
  "0x5555555555555555555555555555555555555555";

const tokenA =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const tokenB =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const hash = (character: string) =>
  `0x${character.repeat(64)}`;

test("builds deterministic evidence-first wallet relationships", () => {
  const observations:
    EvmRelationshipObservation[] = [
    {
      kind: "erc20_transfer",
      transactionHash: hash("1"),
      blockNumber: 1,
      timestamp: "2026-01-01T00:00:00Z",
      from: a,
      to: wallet,
      tokenAddress: tokenA,
      rawValue: "100",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("2"),
      blockNumber: 2,
      timestamp: "2026-01-03T00:00:00Z",
      from: wallet,
      to: a,
      tokenAddress: tokenA,
      rawValue: "20",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("2"),
      blockNumber: 2,
      timestamp: "2026-01-03T00:00:00Z",
      from: wallet,
      to: a,
      tokenAddress: tokenB,
      rawValue: "30",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("3"),
      blockNumber: 3,
      timestamp: "2026-01-02T00:00:00Z",
      from: b,
      to: wallet,
      tokenAddress: tokenA,
      rawValue: "40",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("4"),
      blockNumber: 4,
      timestamp: "2026-01-04T00:00:00Z",
      from: wallet,
      to: c,
      tokenAddress: tokenA,
      rawValue: "50",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("5"),
      blockNumber: 5,
      timestamp: "2026-01-05T00:00:00Z",
      from: wallet,
      to: dead,
      tokenAddress: tokenA,
      rawValue: "60",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("6"),
      blockNumber: 6,
      timestamp: "2026-01-06T00:00:00Z",
      from: wallet,
      to: wallet,
      tokenAddress: tokenA,
      rawValue: "70",
    },
    {
      kind: "erc20_transfer",
      transactionHash: hash("7"),
      blockNumber: 7,
      timestamp: "2026-01-07T00:00:00Z",
      from: unrelated,
      to: c,
      tokenAddress: tokenA,
      rawValue: "80",
    },
  ];

  const result =
    analyzeEvmWalletRelationships({
      walletAddress: wallet,
      observations,
      coverage:
        ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE,
    });

  const edges =
    new Map(
      result.counterparties.map(
        edge => [
          edge.counterparty,
          edge,
        ]
      )
    );

  const edgeA = edges.get(a);
  const edgeB = edges.get(b);
  const edgeC = edges.get(c);
  const burn = edges.get(dead);

  assert.ok(edgeA);
  assert.ok(edgeB);
  assert.ok(edgeC);
  assert.ok(burn);

  assert.equal(
    edgeA.direction,
    "bidirectional"
  );

  assert.equal(
    edgeB.direction,
    "incoming"
  );

  assert.equal(
    edgeC.direction,
    "outgoing"
  );

  assert.deepEqual(
    edgeA.evidenceTransactionHashes,
    [
      hash("1"),
      hash("2"),
    ]
  );

  assert.deepEqual(
    edgeA.observedTokenAddresses,
    [
      tokenA,
      tokenB,
    ]
  );

  assert.equal(
    edgeA.firstSeen,
    "2026-01-01T00:00:00Z"
  );

  assert.equal(
    edgeA.lastSeen,
    "2026-01-03T00:00:00Z"
  );

  assert.equal(
    edgeA.attribution.label,
    null
  );

  assert.equal(
    burn.attribution.label?.category,
    "burn"
  );

  assert.equal(
    burn.attribution.label?.confidence,
    "high"
  );

  assert.equal(
    burn.attribution.label?.source,
    "deterministic"
  );

  assert.equal(
    result.selfInteractionCount,
    1
  );

  assert.equal(
    result.ignoredEvidenceCount,
    1
  );

  assert.equal(
    result.coverage.includesEvmTransactions,
    false
  );

  assert.equal(
    result.coverage.includesErc20Transfers,
    true
  );
});

test("rejects invalid focal wallet", () => {
  assert.throws(
    () =>
      analyzeEvmWalletRelationships({
        walletAddress: "invalid",
        observations: [],
        coverage:
          ERC20_TRANSFER_ONLY_RELATIONSHIP_COVERAGE,
      }),
    /Invalid EVM wallet address/
  );
});
