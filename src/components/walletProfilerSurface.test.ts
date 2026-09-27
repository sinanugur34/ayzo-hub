import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

const planTypes =
  fs.readFileSync(
    "src/lib/plans/types.ts",
    "utf8"
  );

const wrapper =
  fs.readFileSync(
    "src/components/WalletTrackRecord.tsx",
    "utf8"
  );

const profiler =
  fs.readFileSync(
    "src/components/WalletProfiler.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const memory =
  fs.readFileSync(
    "src/components/account/WalletProfileMemoryPanel.tsx",
    "utf8"
  );

const evm =
  fs.readFileSync(
    "src/components/EvmIntelligenceReport.tsx",
    "utf8"
  );

const solana =
  fs.readFileSync(
    "src/components/IntelligenceReport.tsx",
    "utf8"
  );

test(
  "Wallet Profiler is a Pro and Advanced live feature, not Free",
  () => {
    assert.match(
      planTypes,
      /"walletProfiler"/
    );

    const freeBlock =
      registry.slice(
        registry.indexOf(
          "const LIVE_PLATFORM_FEATURES"
        ),
        registry.indexOf(
          "const PRO_PLATFORM_FEATURES"
        )
      );

    const proBlock =
      registry.slice(
        registry.indexOf(
          "const PRO_PLATFORM_FEATURES"
        ),
        registry.indexOf(
          "const ADVANCED_PLATFORM_FEATURES"
        )
      );

    assert.doesNotMatch(
      freeBlock,
      /walletProfiler/
    );

    assert.match(
      proBlock,
      /walletProfiler:\s*true/
    );

    assert.match(
      registry,
      /\.\.\.PRO_PLATFORM_FEATURES/
    );
  }
);

test(
  "Track Record upgrades to Wallet Profiler only when subject is eligible and plan allows it",
  () => {
    assert.match(
      wrapper,
      /profileEligible/
    );

    assert.match(
      wrapper,
      /planHasFeature\(\s*plan,\s*"walletProfiler"\s*\)/
    );

    assert.match(
      wrapper,
      /WalletProfilerPanel/
    );

    assert.match(
      profiler,
      /WALLET PROFILE/
    );

    assert.match(
      profiler,
      /Observed evidence profile/
    );

    assert.match(
      profiler,
      /Evidence boundary/
    );
  }
);

test(
  "EVM enables profiles only for wallet subjects",
  () => {
    assert.match(
      evm,
      /profileEligible=\{\s*data\.assetKind ===\s*"wallet"\s*\}/
    );
  }
);

test(
  "Solana holder-wallet set remains Track Record instead of being mislabeled as one wallet profile",
  () => {
    assert.match(
      solana,
      /subjectLabel="Analyzed holder-wallet set"/
    );

    assert.match(
      solana,
      /profileEligible=\{false\}/
    );
  }
);

test(
  "Account exposes Wallet Profile Memory from existing evidence snapshots",
  () => {
    assert.match(
      account,
      /WalletProfileMemoryPanel/
    );

    assert.match(
      account,
      /walletProfilerEnabled/
    );

    assert.match(
      memory,
      /Profile Memory/
    );

    assert.match(
      memory,
      /subject_type ===\s*"wallet"/
    );

    assert.match(
      memory,
      /does not assign wallet scores or identities/
    );
  }
);
