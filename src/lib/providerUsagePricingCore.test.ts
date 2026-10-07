import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveProviderUsagePricing,
} from "./providerUsagePricingCore";

function approximately(
  actual:
    number | null,

  expected:
    number
) {
  assert.notEqual(
    actual,
    null
  );

  assert.ok(
    Math.abs(
      Number(actual) -
        expected
    ) <
      1e-12
  );
}

test(
  "Helius standard Solana RPC uses one credit",
  () => {
    for (
      const operation of [
        "solana.rpc.getTokenSupply",
        "solana.rpc.getTokenLargestAccounts",
        "solana.rpc.getMultipleAccounts",
      ]
    ) {
      const result =
        resolveProviderUsagePricing({
          provider:
            "helius",

          operation,
        });

      assert.equal(
        result.nativeUnitKind,
        "credit"
      );

      assert.equal(
        result.nativeUnits,
        1
      );

      approximately(
        result.estimatedPublicCostUsd,
        0.000005
      );
    }
  }
);

test(
  "Helius archival calls use ten credits",
  () => {
    for (
      const operation of [
        "solana.rpc.getSignaturesForAddress",
        "solana.rpc.getTransaction",
      ]
    ) {
      const result =
        resolveProviderUsagePricing({
          provider:
            "helius",

          operation,
        });

      assert.equal(
        result.nativeUnits,
        10
      );

      approximately(
        result.estimatedPublicCostUsd,
        0.00005
      );
    }
  }
);

test(
  "Helius getTransactionsForAddress remains explicitly unresolved",
  () => {
    const result =
      resolveProviderUsagePricing({
        provider:
          "helius",

        operation:
          "solana.rpc.getTransactionsForAddress",
      });

    assert.equal(
      result.nativeUnitKind,
      "credit"
    );

    assert.equal(
      result.nativeUnits,
      null
    );

    assert.equal(
      result.estimatedPublicCostUsd,
      null
    );

    assert.equal(
      result.pricingStatus,
      "public_reference_conflict"
    );
  }
);

test(
  "Alchemy getrawtransaction consumes ten CU",
  () => {
    for (
      const operation of [
        "bitcoin.rpc.getrawtransaction",
        "dogecoin.getrawtransaction",
        "litecoin.getrawtransaction",
      ]
    ) {
      const result =
        resolveProviderUsagePricing({
          provider:
            "alchemy",

          operation,
        });

      assert.equal(
        result.nativeUnitKind,
        "compute_unit"
      );

      assert.equal(
        result.nativeUnits,
        10
      );

      approximately(
        result.estimatedPublicCostUsd,
        0.00000525
      );
    }
  }
);

test(
  "Alchemy EVM method CU registry is operation aware",
  () => {
    const expected = [
      [
        "evm.rpc.eth_blockNumber",
        10,
      ],
      [
        "evm.rpc.eth_getCode",
        20,
      ],
      [
        "evm.rpc.eth_getTransactionReceipt",
        20,
      ],
      [
        "evm.rpc.eth_call",
        26,
      ],
      [
        "evm.rpc.eth_getLogs",
        60,
      ],
      [
        "evm.transactions",
        120,
      ],
    ] as const;

    for (
      const [
        operation,
        units,
      ] of expected
    ) {
      const result =
        resolveProviderUsagePricing({
          provider:
            "alchemy",

          operation,
        });

      assert.equal(
        result.nativeUnits,
        units
      );

      assert.equal(
        result.pricingStatus,
        "verified_public"
      );
    }
  }
);

test(
  "unknown Alchemy RPC method never invents CU consumption",
  () => {
    const result =
      resolveProviderUsagePricing({
        provider:
          "alchemy",

        operation:
          "evm.rpc.future_unknown_method",
      });

    assert.equal(
      result.nativeUnitKind,
      "request"
    );

    assert.equal(
      result.nativeUnits,
      1
    );

    assert.equal(
      result.estimatedPublicCostUsd,
      null
    );

    assert.equal(
      result.pricingStatus,
      "request_only"
    );
  }
);

test(
  "GoldRush response-dependent pricing remains unresolved",
  () => {
    const result =
      resolveProviderUsagePricing({
        provider:
          "goldrush",

        operation:
          "evm.transactions",
      });

    assert.equal(
      result.nativeUnitKind,
      "credit"
    );

    assert.equal(
      result.nativeUnits,
      null
    );

    assert.equal(
      result.estimatedPublicCostUsd,
      null
    );

    assert.equal(
      result.pricingStatus,
      "dynamic_unresolved"
    );
  }
);

test(
  "unpriced providers remain request-only",
  () => {
    const result =
      resolveProviderUsagePricing({
        provider:
          "blockchair",

        operation:
          "bitcoin.history",
      });

    assert.equal(
      result.nativeUnitKind,
      "request"
    );

    assert.equal(
      result.nativeUnits,
      1
    );

    assert.equal(
      result.estimatedPublicCostUsd,
      null
    );
  }
);

test(
  "Alchemy Solana RPC methods use verified public CU values",
  () => {
    const expected = [
      ["solana.rpc.getAccountInfo", 10],
      ["solana.rpc.getTokenSupply", 20],
      ["solana.rpc.getTokenLargestAccounts", 20],
      ["solana.rpc.getMultipleAccounts", 20],
      ["solana.rpc.getSignaturesForAddress", 40],
      ["solana.rpc.getTransaction", 40],
      ["solana.rpc.getTransactionsForAddress", 100],
    ] as const;

    for (
      const [
        operation,
        units,
      ] of expected
    ) {
      const result =
        resolveProviderUsagePricing({
          provider:
            "alchemy",

          operation,
        });

      assert.equal(
        result.nativeUnitKind,
        "compute_unit"
      );

      assert.equal(
        result.nativeUnits,
        units
      );

      assert.equal(
        result.pricingStatus,
        "verified_public"
      );
    }
  }
);
