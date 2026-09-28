import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSeoAnalysisPrefill,
} from "./seoAnalysisPrefill";

test(
  "accepts an explicit SEO Solana handoff",
  () => {
    assert.deepEqual(
      parseSeoAnalysisPrefill(
        "?network=solana&source=seo"
      ),
      {
        network:
          "solana",

        source:
          "seo",
      }
    );
  }
);

test(
  "supports live EVM networks",
  () => {
    assert.deepEqual(
      parseSeoAnalysisPrefill(
        "?source=seo&network=base"
      ),
      {
        network:
          "base",

        source:
          "seo",
      }
    );
  }
);

test(
  "does not activate without explicit SEO source",
  () => {
    assert.equal(
      parseSeoAnalysisPrefill(
        "?network=solana"
      ),
      null
    );

    assert.equal(
      parseSeoAnalysisPrefill(
        "?network=solana&source=unknown"
      ),
      null
    );
  }
);

test(
  "rejects unavailable or unknown networks",
  () => {
    assert.equal(
      parseSeoAnalysisPrefill(
        "?network=cardano&source=seo"
      ),
      null
    );

    assert.equal(
      parseSeoAnalysisPrefill(
        "?network=not-a-network&source=seo"
      ),
      null
    );
  }
);

test(
  "never returns analysis subjects from URL parameters",
  () => {
    const result =
      parseSeoAnalysisPrefill(
        "?network=solana&source=seo" +
        "&address=SensitiveWalletValue" +
        "&subject=SensitiveTokenValue" +
        "&transactionHash=SensitiveTxValue"
      );

    assert.deepEqual(
      result,
      {
        network:
          "solana",

        source:
          "seo",
      }
    );

    assert.ok(
      result
    );

    assert.equal(
      "address" in result,
      false
    );

    assert.equal(
      "subject" in result,
      false
    );

    assert.equal(
      "transactionHash" in result,
      false
    );
  }
);

test(
  "accepts search strings with or without a leading question mark",
  () => {
    assert.deepEqual(
      parseSeoAnalysisPrefill(
        "network=bitcoin&source=seo"
      ),
      {
        network:
          "bitcoin",

        source:
          "seo",
      }
    );
  }
);
