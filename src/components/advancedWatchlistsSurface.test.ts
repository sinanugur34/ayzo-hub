import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const route =
  fs.readFileSync(
    "src/app/api/account/advanced-watchlists/route.ts",
    "utf8"
  );

test(
  "Account exposes Advanced Watchlists",
  () => {
    assert.ok(
      account.includes(
        "<AdvancedWatchlistsPanel />"
      )
    );
  }
);

test(
  "Advanced Watchlists is Advanced gated and ownership scoped",
  () => {
    assert.ok(
      route.includes(
        "canUseAdvancedWatchlists"
      )
    );

    assert.ok(
      route.includes(
        '.eq(\n        "user_id",'
      )
    );

    assert.ok(
      route.includes(
        '"Cache-Control":\n          "no-store"'
      )
    );
  }
);
