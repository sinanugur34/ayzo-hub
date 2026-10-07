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
  "all three internal Solana routes restore propagated provider scope",
  () => {
    for (
      const path of [
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
        /runWithPropagatedProviderUsage/
      );

      assert.match(
        source,
        /providerUsageFetch/
      );

      assert.match(
        source,
        /provider:\s*"helius"/
      );
    }
  }
);

test(
  "Helius telemetry uses RPC method as bounded operation name",
  () => {
    for (
      const path of [
        "src/app/api/solana/holders/route.ts",
        "src/app/api/solana/relationships/route.ts",
        "src/app/api/solana/funding/route.ts",
      ]
    ) {
      assert.match(
        read(
          path
        ),
        /solana\.rpc\.\$\{method\}/
      );
    }
  }
);

test(
  "direct Solana intelligence route owns an analysis telemetry scope",
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
