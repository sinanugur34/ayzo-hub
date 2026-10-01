import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "src/lib/intelligence/algorand/provider.ts",
    "utf8"
  );

test(
  "Algorand keeps independent indexed transport fallback",
  () => {
    assert.ok(
      source.includes(
        "mainnet-idx.4160.nodely.dev"
      )
    );

    assert.ok(
      source.includes(
        "mainnet-idx.algonode.xyz"
      )
    );

    assert.ok(
      source.includes(
        "mainnet-idx.algonode.network"
      )
    );

    assert.ok(
      source.includes(
        "transportFailoverUsed"
      )
    );
  }
);
