import assert from "node:assert/strict";
import test from "node:test";

import {
  EVM_MARKET_FLOW_SCHEMA_VERSION,
  buildEvmMarketFlowIntelligence,
} from "./marketFlowIntelligence";

const wallet =
  "0x1111111111111111111111111111111111111111";

const a =
  "0x2222222222222222222222222222222222222222";

const b =
  "0x3333333333333333333333333333333333333333";

const unrelated =
  "0x4444444444444444444444444444444444444444";

const tokenA =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const tokenB =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const hash = (
  character:
    string
) =>
  `0x${character.repeat(64)}`;

test(
  "builds deterministic evidence-first market flow intelligence",
  () => {
    const result =
      buildEvmMarketFlowIntelligence({
        analyzedAddress:
          wallet,

        transactions: [
          {
            hash: hash("1"),
            blockNumber: 1,
            timestamp:
              "2026-01-01T00:00:00Z",
            from: a,
            to: wallet,
            value: "100",
          },
          {
            hash: hash("2"),
            blockNumber: 2,
            timestamp:
              "2026-01-02T00:00:00Z",
            from: wallet,
            to: b,
            value: "40",
          },
          {
            hash: hash("3"),
            blockNumber: 3,
            timestamp:
              "2026-01-03T00:00:00Z",
            from: wallet,
            to: wallet,
            value: "5",
          },
          {
            hash: hash("4"),
            blockNumber: 4,
            timestamp:
              "2026-01-04T00:00:00Z",
            from: unrelated,
            to: b,
            value: "999",
          },
        ],

        transfers: [
          {
            transactionHash:
              hash("5"),
            blockNumber: 5,
            timestamp:
              "2026-01-05T00:00:00Z",
            from: a,
            to: wallet,
            tokenAddress:
              tokenA,
            value: "25",
          },
          {
            transactionHash:
              hash("6"),
            blockNumber: 6,
            timestamp:
              "2026-01-06T00:00:00Z",
            from: wallet,
            to: a,
            tokenAddress:
              tokenA,
            value: "10",
          },
          {
            transactionHash:
              hash("7"),
            blockNumber: 7,
            timestamp:
              "2026-01-07T00:00:00Z",
            from: wallet,
            to: b,
            tokenAddress:
              tokenB,
            value: "15",
          },
        ],

        transactionsAvailable:
          true,

        transfersAvailable:
          true,

        transactionExhausted:
          false,

        transferExhausted:
          false,
      });

    assert.equal(
      result.schemaVersion,
      EVM_MARKET_FLOW_SCHEMA_VERSION
    );

    assert.equal(
      result.incomingObservationCount,
      2
    );

    assert.equal(
      result.outgoingObservationCount,
      3
    );

    assert.equal(
      result.selfObservationCount,
      1
    );

    assert.equal(
      result.totalDirectionalObservationCount,
      5
    );

    assert.equal(
      result.dominantDirection,
      "outgoing"
    );

    assert.equal(
      result.uniqueCounterpartyCount,
      2
    );

    assert.equal(
      result.counterparties[0]
        ?.address,
      a
    );

    assert.equal(
      result.counterparties[0]
        ?.totalObservationCount,
      3
    );

    assert.equal(
      result.topCounterpartyObservationShare,
      0.6
    );

    assert.equal(
      result.assets.length,
      3
    );

    assert.equal(
      result.firstObservedAt,
      "2026-01-01T00:00:00Z"
    );

    assert.equal(
      result.lastObservedAt,
      "2026-01-07T00:00:00Z"
    );

    assert.equal(
      result.recentFlows[0]
        ?.transactionHash,
      hash("7")
    );

    assert.match(
      result.methodology,
      /not monetary totals/
    );

    assert.match(
      result.limitation,
      /bounded/
    );
  }
);

test(
  "keeps assets separate instead of inventing cross-asset monetary totals",
  () => {
    const result =
      buildEvmMarketFlowIntelligence({
        analyzedAddress:
          wallet,

        transactions: [
          {
            hash: hash("8"),
            blockNumber: 8,
            timestamp:
              "2026-02-01T00:00:00Z",
            from: a,
            to: wallet,
            value:
              "1000000000000000000",
          },
        ],

        transfers: [
          {
            transactionHash:
              hash("9"),
            blockNumber: 9,
            timestamp:
              "2026-02-02T00:00:00Z",
            from: a,
            to: wallet,
            tokenAddress:
              tokenA,
            value:
              "999999999",
          },
        ],

        transactionsAvailable:
          true,

        transfersAvailable:
          true,

        transactionExhausted:
          true,

        transferExhausted:
          true,
      });

    assert.equal(
      result.assets.length,
      2
    );

    assert.equal(
      result.totalDirectionalObservationCount,
      2
    );

    assert.equal(
      "totalValue" in result,
      false
    );

    assert.equal(
      "usdValue" in result,
      false
    );
  }
);

test(
  "ignores unrelated evidence",
  () => {
    const result =
      buildEvmMarketFlowIntelligence({
        analyzedAddress:
          wallet,

        transactions: [
          {
            hash: hash("a"),
            blockNumber: 10,
            timestamp:
              "2026-03-01T00:00:00Z",
            from: a,
            to: b,
            value: "123",
          },
        ],

        transfers:
          [],

        transactionsAvailable:
          true,

        transfersAvailable:
          false,

        transactionExhausted:
          true,

        transferExhausted:
          true,
      });

    assert.equal(
      result.totalDirectionalObservationCount,
      0
    );

    assert.equal(
      result.uniqueCounterpartyCount,
      0
    );

    assert.equal(
      result.dominantDirection,
      "none"
    );

    assert.equal(
      result.recentFlows.length,
      0
    );
  }
);

test(
  "rejects invalid EVM root address",
  () => {
    assert.throws(
      () =>
        buildEvmMarketFlowIntelligence({
          analyzedAddress:
            "invalid",

          transactions:
            [],

          transfers:
            [],

          transactionsAvailable:
            true,

          transfersAvailable:
            true,

          transactionExhausted:
            true,

          transferExhausted:
            true,
        }),
      /valid EVM address/
    );
  }
);
