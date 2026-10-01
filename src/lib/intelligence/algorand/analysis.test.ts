import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAlgorandDerivedAnalysis,
} from "./analysis";

import {
  getAlgorandAnalysisPolicy,
} from "./policy";

import type {
  AlgorandEvidence,
} from "./types";

const ROOT =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const OTHER =
  "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE";

test(
  "derives explicit Algorand ALGO/ASA flow, counterparties, funding, authority, timeline and graph",
  () => {
    const evidence:
      AlgorandEvidence = {
        network:
          "algorand",

        address:
          ROOT,

        analysisPlan:
          "free",

        amountMicroAlgos:
          "1000000",

        minBalanceMicroAlgos:
          "100000",

        authAddress:
          OTHER,

        totalAssetsOptedIn:
          1,

        totalAppsOptedIn:
          1,

        assets: [
          {
            assetId:
              123,

            amount:
              "9",

            frozen:
              false,
          },
        ],

        createdAssets: [
          {
            assetId:
              123,

            creator:
              ROOT,

            total:
              "100",

            decimals:
              0,

            name:
              "Test",

            unitName:
              "T",

            manager:
              ROOT,

            reserve:
              null,

            freeze:
              ROOT,

            clawback:
              OTHER,
          },
        ],

        appLocalStates: [
          {
            applicationId:
              77,
          },
        ],

        createdApplications: [
          {
            applicationId:
              88,

            creator:
              ROOT,
          },
        ],

        transactions: [
          {
            id:
              "IN",

            confirmedRound:
              10,

            roundTime:
              100,

            type:
              "pay",

            sender:
              OTHER,

            rekeyTo:
              null,

            payment: {
              receiver:
                ROOT,

              amountMicroAlgos:
                "5000",

              closeRemainderTo:
                null,
            },

            assetTransfer:
              null,

            assetFreeze:
              null,

            applicationCall:
              null,

            createdAssetId:
              null,

            createdApplicationId:
              null,

            innerTransactions:
              [],
          },

          {
            id:
              "OUT",

            confirmedRound:
              11,

            roundTime:
              101,

            type:
              "axfer",

            sender:
              ROOT,

            rekeyTo:
              OTHER,

            payment:
              null,

            assetTransfer: {
              assetId:
                123,

              receiver:
                OTHER,

              amount:
                "7",

              explicitSender:
                null,

              closeTo:
                null,
            },

            assetFreeze:
              null,

            applicationCall:
              null,

            createdAssetId:
              null,

            createdApplicationId:
              null,

            innerTransactions:
              [],
          },
        ],

        coverage: {
          plan:
            "free",

          transactionLimit:
            20,

          assetLimit:
            24,

          createdAssetLimit:
            12,

          applicationLimit:
            16,

          providerRequestBudget:
            14,

          providerRequestsUsed:
            6,

          historyHasMore:
            false,

          assetsHaveMore:
            false,

          createdAssetsHaveMore:
            false,

          appLocalStateHasMore:
            false,

          createdAppsHaveMore:
            false,

          transportFailoverUsed:
            false,

          unavailableEvidence:
            [],

          coverage:
            "complete",
        },
      };

    const derived =
      buildAlgorandDerivedAnalysis({
        address:
          ROOT,

        evidence,

        policy:
          getAlgorandAnalysisPolicy(
            "free"
          ),
      });

    assert.equal(
      derived.flow
        .incomingCount,
      1
    );

    assert.equal(
      derived.flow
        .outgoingCount,
      1
    );

    assert.equal(
      derived.flow
        .incomingMicroAlgos,
      "5000"
    );

    assert.equal(
      derived
        .counterparties
        .count,
      1
    );

    assert.equal(
      derived
        .observedFunding
        ?.sourceAddress,
      OTHER
    );

    assert.equal(
      derived
        .authority
        .currentAuthAddress,
      OTHER
    );

    assert.equal(
      derived
        .authority
        .observedRekeys
        .length,
      1
    );

    assert.equal(
      derived
        .assets
        .controlledAssetCount,
      1
    );

    assert.equal(
      derived
        .timeline
        .events
        .length,
      2
    );

    assert.equal(
      derived
        .graph
        .nodes
        .length,
      2
    );

    assert.equal(
      derived
        .graph
        .edges
        .length,
      2
    );
  }
);
