import assert from "node:assert/strict";
import test from "node:test";

import {
  getHederaFallbackProvider,
  getHederaPrimaryProvider,
  hasHederaIndependentProductionProvider,
} from "./providerConfig";

function withEnv(
  changes:
    Record<
      string,
      string | undefined
    >,
  fn:
    () => void
) {
  const previous =
    new Map<
      string,
      string | undefined
    >();

  for (
    const [
      key,
      value,
    ] of Object.entries(
      changes
    )
  ) {
    previous.set(
      key,
      process.env[key]
    );

    if (
      value ===
        undefined
    ) {
      delete process.env[
        key
      ];
    } else {
      process.env[key] =
        value;
    }
  }

  try {
    fn();
  } finally {
    for (
      const [
        key,
        value,
      ] of previous
    ) {
      if (
        value ===
          undefined
      ) {
        delete process.env[
          key
        ];
      } else {
        process.env[key] =
          value;
      }
    }
  }
}

test(
  "public Hedera mirror remains the canonical primary",
  () => {
    withEnv(
      {
        HEDERA_MIRROR_URL:
          undefined,
      },
      () => {
        const provider =
          getHederaPrimaryProvider();

        assert.equal(
          provider.id,
          "hedera-mirror-public"
        );

        assert.equal(
          provider.independent,
          false
        );

        assert.equal(
          provider.baseUrl,
          "https://mainnet-public.mirrornode.hedera.com/api/v1"
        );
      }
    );
  }
);

test(
  "independent Hedera fallback fails closed without key",
  () => {
    withEnv(
      {
        HGRAPH_API_KEY:
          undefined,

        HEDERA_MIRROR_FALLBACK_URL:
          undefined,
      },
      () => {
        assert.equal(
          getHederaFallbackProvider(),
          null
        );

        assert.equal(
          hasHederaIndependentProductionProvider(),
          false
        );
      }
    );
  }
);

test(
  "Hgraph becomes an independent mirror fallback only when configured",
  () => {
    withEnv(
      {
        HGRAPH_API_KEY:
          "test-only-key",

        HEDERA_MIRROR_FALLBACK_URL:
          undefined,
      },
      () => {
        const provider =
          getHederaFallbackProvider();

        assert.ok(
          provider
        );

        assert.equal(
          provider?.id,
          "hedera-hgraph"
        );

        assert.equal(
          provider?.baseUrl,
          "https://hedera.hgraph.com/api/v1"
        );

        assert.equal(
          provider?.independent,
          true
        );

        assert.equal(
          hasHederaIndependentProductionProvider(),
          true
        );
      }
    );
  }
);
