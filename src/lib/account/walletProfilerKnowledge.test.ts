import assert from "node:assert/strict";
import test from "node:test";

import {
  getAskAyzoSiteKnowledge,
} from "./askAyzoSiteKnowledge";

import {
  planHasFeature,
} from "@/lib/plans/registry";

test(
  "Ask AYZO knows Wallet Profiler",
  () => {
    const entry =
      getAskAyzoSiteKnowledge(
        "wallet-profiler"
      );

    assert.ok(
      entry
    );

    assert.equal(
      entry.title,
      "Wallet Profiler"
    );

    assert.match(
      entry.description,
      /Pro and Advanced/
    );

    assert.match(
      entry.description,
      /does not assign profitability, identity, ownership or risk scores/
    );
  }
);

test(
  "Wallet Profiler entitlement is Free false, Pro true, Advanced true",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "walletProfiler"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "walletProfiler"
      ),
      true
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "walletProfiler"
      ),
      true
    );
  }
);
