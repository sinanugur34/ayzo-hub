import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read =
  (
    path:
      string
  ) =>
    fs.readFileSync(
      path,
      "utf8"
    );

test(
  "Solana engine propagates telemetry context without counting internal HTTP",
  () => {
    const source =
      read(
        "src/lib/intelligence/solana/engine.ts"
      );

    assert.match(
      source,
      /buildProviderUsagePropagationHeaders/
    );

    assert.doesNotMatch(
      source,
      /providerUsageFetch/
    );
  }
);

test(
  "all Solana routes use shared Alchemy-first RPC transport",
  () => {
    for (
      const path of [
        "src/app/api/solana/token/route.ts",
        "src/app/api/solana/holders/route.ts",
        "src/app/api/solana/relationships/route.ts",
        "src/app/api/solana/funding/route.ts",
      ]
    ) {
      const source =
        read(
          path
        );

      assert.match(
        source,
        /solanaRpcCall|rpcCall/
      );

      assert.doesNotMatch(
        source,
        /HELIUS_API_KEY/
      );

      assert.doesNotMatch(
        source,
        /mainnet\.helius-rpc\.com/
      );
    }
  }
);

test(
  "shared transport owns physical Solana telemetry and fallback",
  () => {
    const source =
      read(
        "src/lib/intelligence/solana/rpcTransport.ts"
      );

    assert.match(
      source,
      /providerUsageFetch/
    );

    assert.match(
      source,
      /provider:\s*provider\.id/
    );

    assert.match(
      source,
      /fallbackUsed/
    );

    assert.match(
      source,
      /solana-mainnet\.g\.alchemy\.com/
    );

    assert.match(
      source,
      /mainnet\.helius-rpc\.com/
    );
  }
);

test(
  "Alchemy appears before Helius in Solana transport",
  () => {
    const source =
      read(
        "src/lib/intelligence/solana/rpcTransport.ts"
      );

    const alchemy =
      source.indexOf(
        '"alchemy"'
      );

    const helius =
      source.indexOf(
        '"helius"'
      );

    assert.ok(
      alchemy >=
        0
    );

    assert.ok(
      helius >
        alchemy
    );
  }
);

test(
  "direct Solana intelligence route owns provider telemetry scope",
  () => {
    const source =
      read(
        "src/app/api/solana/intelligence/route.ts"
      );

    assert.match(
      source,
      /runProviderUsageAnalysis/
    );

    assert.match(
      source,
      /network:\s*"solana"/
    );
  }
);
