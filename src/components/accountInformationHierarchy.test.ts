import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "universal account surfaces appear before Advanced tooling",
  () => {
    const source =
      fs.readFileSync(
        "src/app/account/page.tsx",
        "utf8"
      );

    const security =
      source.indexOf(
        "<DeviceSecurityPanel />"
      );

    const alerts =
      source.indexOf(
        "<AlertRulesPanel />"
      );

    const advanced =
      source.indexOf(
        "<AdvancedWatchlistsPanel />"
      );

    assert.ok(
      security >= 0
    );

    assert.ok(
      alerts > security
    );

    assert.ok(
      advanced > alerts
    );

    assert.equal(
      source.match(
        /<AlertRulesPanel \/>/g
      )?.length,
      1
    );
  }
);
