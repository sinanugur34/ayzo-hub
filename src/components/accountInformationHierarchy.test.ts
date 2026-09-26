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

test(
  "account page visually separates essentials from Advanced workspace",
  () => {
    const source =
      fs.readFileSync(
        "src/app/account/page.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "Account essentials"
      )
    );

    assert.ok(
      source.includes(
        "Advanced workspace"
      )
    );

    const essentials =
      source.indexOf(
        "Account essentials"
      );

    const security =
      source.indexOf(
        "<DeviceSecurityPanel />"
      );

    const advancedWorkspace =
      source.indexOf(
        "<AccountAdvancedWorkspace"
      );

    const advancedPanel =
      source.indexOf(
        "<AdvancedWatchlistsPanel />"
      );

    assert.ok(
      essentials < security
    );

    assert.ok(
      security < advancedWorkspace
    );

    assert.ok(
      advancedWorkspace < advancedPanel
    );
  }
);

test(
  "account summary prioritizes plan and usage before identity",
  () => {
    const source =
      fs.readFileSync(
        "src/app/account/page.tsx",
        "utf8"
      );

    const plan =
      source.indexOf(
        "<AccountPlanCard />"
      );

    const usage =
      source.indexOf(
        "<AccountUsageCard />"
      );

    const identity =
      source.indexOf(
        "Signed in as"
      );

    assert.ok(
      plan >= 0
    );

    assert.ok(
      usage > plan
    );

    assert.ok(
      identity > usage
    );
  }
);
