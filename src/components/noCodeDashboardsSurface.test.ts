import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const panel =
  fs.readFileSync(
    "src/components/account/NoCodeDashboardsPanel.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

test(
  "Account exposes the Advanced No-Code Dashboards workspace",
  () => {
    assert.ok(
      account.includes(
        "NoCodeDashboardsPanel"
      )
    );

    assert.ok(
      panel.includes(
        "/api/account/no-code-dashboards"
      )
    );

    assert.ok(
      panel.includes(
        "Create dashboard"
      )
    );

    assert.ok(
      panel.includes(
        "Add widget"
      )
    );

    assert.ok(
      panel.includes(
        "Delete dashboard"
      )
    );

    assert.ok(
      panel.includes(
        "Remove"
      )
    );
  }
);

test(
  "No-Code Dashboards is live only in Advanced platform features",
  () => {
    assert.ok(
      registry.includes(
        "noCodeDashboards: true"
      )
    );
  }
);
