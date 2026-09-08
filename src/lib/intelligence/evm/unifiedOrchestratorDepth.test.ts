import assert from "node:assert/strict";
import test from "node:test";

import {
  runEvmUnifiedIntelligence,
  type EvmUnifiedOrchestratorDependencies,
} from "./unifiedOrchestrator";

import type {
  EvmTransaction,
} from "./types";

const walletA =
  "0x1111111111111111111111111111111111111111";

const walletB =
  "0x2222222222222222222222222222222222222222";

const walletC =
  "0x3333333333333333333333333333333333333333";

const hash = (
  character: string
) =>
  `0x${character.repeat(64)}`;

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

function createDependencies(
  calls: string[]
): EvmUnifiedOrchestratorDependencies {
  const firstPage:
    EvmTransaction[] = [
      {
        hash: hash("1"),
        blockNumber: 100,
        timestamp:
          "2026-01-01T00:00:00Z",
        from: walletA,
        to: walletB,
        value: "1",
      },
    ];

  const secondPage:
    EvmTransaction[] = [
      {
        hash: hash("2"),
        blockNumber: 99,
        timestamp:
          "2025-12-31T23:59:00Z",
        from: walletC,
        to: walletA,
        value: "2",
      },
    ];

  return {
    readTokenMetadata:
      async () =>
        success(
          {
            address:
              walletA,
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
          address ===
            walletA &&
          cursor === ""
        ) {
          return success({
            transactions:
              firstPage,
            nextCursor: "1",
          });
        }

        if (
          address ===
            walletA &&
          cursor === "1"
        ) {
          return success({
            transactions:
              secondPage,
            nextCursor: null,
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
          "Transfer provider should not run for wallet."
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

test(
  "Free keeps root EVM evidence to one transaction page",
  async () => {
    const calls: string[] =
      [];

    const result =
      await runEvmUnifiedIntelligence(
        {
          networkId:
            "ethereum",
          address:
            walletA,
          analysisPlan:
            "free",
        },
        createDependencies(
          calls
        )
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      calls.includes(
        `${walletA}:1`
      ),
      false
    );
  }
);

test(
  "Pro consumes the second root EVM transaction page",
  async () => {
    const calls: string[] =
      [];

    const result =
      await runEvmUnifiedIntelligence(
        {
          networkId:
            "ethereum",
          address:
            walletA,
          analysisPlan:
            "pro",
        },
        createDependencies(
          calls
        )
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      calls.includes(
        `${walletA}:1`
      ),
      true
    );

    assert.equal(
      result.data.ok,
      true
    );

    if (!result.data.ok) {
      throw new Error(
        "Expected Pro intelligence success."
      );
    }

    const relationships =
      result.data.modules
        .walletRelationships
        .data as {
          inputEvidenceCount:
            number;
        };

    assert.equal(
      relationships
        .inputEvidenceCount,
      2
    );
  }
);

test(
  "Free preserves bounded expansion while Pro scans wider counterparties",
  async () => {
    const makeWallet =
      (character: string) =>
        `0x${character.repeat(40)}`;

    const root =
      makeWallet("1");

    const neighbors = [
      makeWallet("2"),
      makeWallet("3"),
      makeWallet("4"),
      makeWallet("5"),
    ];

    const rootTransactions:
      EvmTransaction[] =
      neighbors.map(
        (
          neighbor,
          index
        ) => ({
          hash:
            hash(
              String(
                index + 3
              )
            ),
          blockNumber:
            200 + index,
          timestamp:
            `2026-01-01T00:0${index}:00Z`,
          from:
            root,
          to:
            neighbor,
          value:
            String(
              100 - index
            ),
        })
      );

    function depsFor(
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
              address ===
                root &&
              cursor === ""
            ) {
              return success({
                transactions:
                  rootTransactions,
                nextCursor:
                  null,
              });
            }

            if (
              neighbors.includes(
                address
              )
            ) {
              if (
                cursor === ""
              ) {
                return success({
                  transactions: [],
                  nextCursor:
                    "1",
                });
              }

              if (
                cursor === "1"
              ) {
                return success({
                  transactions: [],
                  nextCursor:
                    null,
                });
              }
            }

            return success({
              transactions: [],
              nextCursor:
                null,
            });
          },

        getTokenTransfers:
          async () => {
            throw new Error(
              "Transfer provider should not run for wallet."
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

    const freeCalls:
      string[] = [];

    const proCalls:
      string[] = [];

    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",
        address:
          root,
        analysisPlan:
          "free",
      },
      depsFor(
        freeCalls
      )
    );

    await runEvmUnifiedIntelligence(
      {
        networkId:
          "ethereum",
        address:
          root,
        analysisPlan:
          "pro",
      },
      depsFor(
        proCalls
      )
    );

    const freeExpandedWallets =
      new Set(
        freeCalls
          .filter(
            call =>
              !call.startsWith(
                `${root}:`
              )
          )
          .map(
            call =>
              call.split(
                ":"
              )[0]
          )
      );

    const proExpandedWallets =
      new Set(
        proCalls
          .filter(
            call =>
              !call.startsWith(
                `${root}:`
              )
          )
          .map(
            call =>
              call.split(
                ":"
              )[0]
          )
      );

    assert.equal(
      freeExpandedWallets.size,
      2
    );

    assert.equal(
      proExpandedWallets.size,
      4
    );

    for (
      const wallet of
        freeExpandedWallets
    ) {
      assert.equal(
        freeCalls.includes(
          `${wallet}:1`
        ),
        false
      );
    }

    for (
      const wallet of
        proExpandedWallets
    ) {
      assert.equal(
        proCalls.includes(
          `${wallet}:1`
        ),
        true
      );
    }
  }
);
