import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "Dogecoin counterparty section has a truthful empty state",
  () => {
    const source =
      fs.readFileSync(
        "src/components/DogecoinExpandedAnalysis.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "No explicit counterparty relationship was resolved in the bounded canonical sample."
      )
    );
  }
);

test(
  "activity timeline uses network-neutral transfer wording",
  () => {
    const source =
      fs.readFileSync(
        "src/components/ActivityTimeline.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "transfer event(s)"
      )
    );

    assert.equal(
      source.includes(
        "token transfer(s)"
      ),
      false
    );
  }
);

test(
  "XRPL workspace timeline follows plan-aware history depth",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/intelligence/xrpl/presentation.ts",
        "utf8"
      );

    assert.ok(
      source.includes(
        "data.evidenceCoverage.historyLimit"
      )
    );

    assert.ok(
      source.includes(
        "events.slice(\n        0,\n        maxEvents"
      )
    );

    assert.ok(
      source.includes(
        "maxEvents,"
      )
    );

    assert.equal(
      source.includes(
        "events.slice(\n        0,\n        25"
      ),
      false
    );

    assert.equal(
      source.includes(
        "maxEvents:\n        25"
      ),
      false
    );
  }
);
