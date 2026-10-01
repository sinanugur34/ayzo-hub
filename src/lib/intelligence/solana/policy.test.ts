import assert from "node:assert/strict";
import test from "node:test";

import {
  getSolanaAnalysisPolicy,
} from "./policy";

test(
  "Solana Free preserves the established core depth",
  () => {
    const policy =
      getSolanaAnalysisPolicy(
        "free"
      );

    assert.equal(
      policy.walletLimit,
      5
    );

    assert.equal(
      policy.relationshipSignatureLimit,
      50
    );

    assert.equal(
      policy.relationshipSharedTxDetailLimit,
      25
    );

    assert.equal(
      policy.fundingTransactionLimitPerWallet,
      12
    );

    assert.equal(
      policy.graphMaxNodes,
      8
    );

    assert.equal(
      policy.timelineMaxEvents,
      8
    );
  }
);

test(
  "Solana Pro and Advanced deepen every bounded evidence axis",
  () => {
    const free =
      getSolanaAnalysisPolicy(
        "free"
      );

    const pro =
      getSolanaAnalysisPolicy(
        "pro"
      );

    const advanced =
      getSolanaAnalysisPolicy(
        "advanced"
      );

    const keys =
      Object.keys(
        free
      ) as (
        keyof typeof free
      )[];

    for (
      const key of keys
    ) {
      assert.ok(
        free[key] <
          pro[key],
        `${String(
          key
        )}: Free must be shallower than Pro`
      );

      assert.ok(
        pro[key] <
          advanced[key],
        `${String(
          key
        )}: Pro must be shallower than Advanced`
      );
    }
  }
);

test(
  "Solana Advanced remains provider-bounded",
  () => {
    const advanced =
      getSolanaAnalysisPolicy(
        "advanced"
      );

    assert.ok(
      advanced.walletLimit <=
        12
    );

    assert.ok(
      advanced.relationshipSignatureLimit <=
        120
    );

    assert.ok(
      advanced.relationshipSharedTxDetailLimit <=
        50
    );

    assert.ok(
      advanced.fundingTransactionLimitPerWallet <=
        32
    );

    assert.ok(
      advanced.timelineMaxEvents <=
        25
    );
  }
);
