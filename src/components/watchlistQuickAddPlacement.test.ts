import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "src/components/AnalysisActions.tsx",
    "utf8"
  );

test(
  "Watchlist create panel renders immediately before Advanced research panels",
  () => {
    const button =
      source.indexOf(
        "Add to Watchlist"
      );

    const panel =
      source.indexOf(
        "New watchlist"
      );

    const cases =
      source.indexOf(
        "<CaseQuickAdd"
      );

    assert.ok(
      button >= 0
    );

    assert.ok(
      panel > button
    );

    assert.ok(
      cases > panel
    );
  }
);

test(
  "Watchlist panel preserves create-and-add flow",
  () => {
    assert.ok(
      source.includes(
        "createAndAdd"
      )
    );

    assert.ok(
      source.includes(
        '"/api/account/watchlists"'
      )
    );

    assert.ok(
      source.includes(
        "Create & Add"
      )
    );
  }
);
