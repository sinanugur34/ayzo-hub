import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMobileResultSummary,
} from "./mobileResultSummary";

test(
  "summarizes Bitcoin modules and caveats",
  () => {
    const result =
      buildMobileResultSummary({
        ok: true,
        network: "bitcoin",
        coverage: "partial",
        findings: [],
        modules: {
          addressHistory: {
            status: "complete",
            error: null,
          },
          canonicalTransactionEvidence: {
            status: "limited",
            error: "Bounded evidence.",
          },
        },
        caveats: [
          "Observed evidence only.",
        ],
      });

    assert.equal(
      result.coverage,
      "partial"
    );

    assert.equal(
      result.modules.length,
      2
    );

    assert.equal(
      result.modules[0]?.label,
      "Address History"
    );

    assert.equal(
      result.modules[1]?.status,
      "limited"
    );

    assert.deepEqual(
      result.caveats,
      ["Observed evidence only."]
    );
  }
);

test(
  "summarizes findings safely",
  () => {
    const result =
      buildMobileResultSummary({
        coverage: "full",
        findings: [
          {
            id: "one",
            category: "funding",
            title: "Observed funding",
            summary: "Evidence found.",
            severity: "informational",
            confidence: "high",
          },
        ],
      });

    assert.equal(
      result.findings.length,
      1
    );

    assert.equal(
      result.findings[0]?.title,
      "Observed funding"
    );
  }
);

test(
  "falls back to observed Solana evidence sections",
  () => {
    const result =
      buildMobileResultSummary({
        holders: {},
        relationships: {},
        funding: {},
      });

    assert.deepEqual(
      result.modules.map(
        (module) => module.id
      ),
      [
        "holders",
        "relationships",
        "funding",
      ]
    );
  }
);
