import assert from "node:assert/strict";
import test from "node:test";

import {
  getSolanaAnalysisPolicy,
} from "./policy";

test(
  "Solana Free preserves current five-wallet evidence depth",
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
      policy.fundingTransactionLimitPerWallet,
      12
    );
  }
);

test(
  "Solana paid plans increase bounded wallet evidence depth",
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

    assert.equal(
      pro.walletLimit,
      7
    );

    assert.equal(
      advanced.walletLimit,
      10
    );

    assert.ok(
      free.walletLimit <
        pro.walletLimit
    );

    assert.ok(
      pro.walletLimit <
        advanced.walletLimit
    );
  }
);

test(
  "Solana V1 widens wallets without multiplying per-wallet RPC depth",
  () => {
    const plans =
      [
        "free",
        "pro",
        "advanced",
      ] as const;

    for (const plan of plans) {
      const policy =
        getSolanaAnalysisPolicy(
          plan
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
    }
  }
);
