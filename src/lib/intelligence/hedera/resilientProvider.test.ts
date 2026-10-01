import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "Hedera fallback is restricted to upstream-style failures",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/intelligence/hedera/resilientProvider.ts",
        "utf8"
      );

    for (
      const code of [
        "RATE_LIMITED",
        "TIMEOUT",
        "UPSTREAM_ERROR",
        "MALFORMED_RESPONSE",
      ]
    ) {
      assert.ok(
        source.includes(
          `"${code}"`
        )
      );
    }

    assert.equal(
      source.includes(
        '"INVALID_ACCOUNT"'
      ),
      false
    );

    assert.equal(
      source.includes(
        '"NOT_FOUND"'
      ),
      false
    );
  }
);

test(
  "Hedera fallback uses independent provider configuration",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/intelligence/hedera/resilientProvider.ts",
        "utf8"
      );

    assert.ok(
      source.includes(
        "getHederaFallbackProvider"
      )
    );

    assert.ok(
      source.includes(
        "fallback.apiKey"
      )
    );

    assert.ok(
      source.includes(
        "fallback.id"
      )
    );
  }
);
