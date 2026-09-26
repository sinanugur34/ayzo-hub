import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cases =
  fs.readFileSync(
    "src/components/account/CasesPanel.tsx",
    "utf8"
  );

const batch =
  fs.readFileSync(
    "src/components/account/BatchAnalysisPanel.tsx",
    "utf8"
  );

const alerts =
  fs.readFileSync(
    "src/components/account/CustomAlertRulesPanel.tsx",
    "utf8"
  );

const dashboards =
  fs.readFileSync(
    "src/components/account/NoCodeDashboardsPanel.tsx",
    "utf8"
  );

test(
  "large Advanced creation forms start as compact disclosures",
  () => {
    const surfaces = [
      [
        cases,
        "Create a case",
      ],
      [
        batch,
        "Run a batch",
      ],
      [
        alerts,
        "Create an alert rule",
      ],
      [
        dashboards,
        "Create a dashboard",
      ],
    ] as const;

    for (
      const [
        source,
        label,
      ] of surfaces
    ) {
      assert.ok(
        source.includes(
          "<details"
        ),
        `${label} must use a compact disclosure`
      );

      assert.ok(
        source.includes(
          "<summary"
        ),
        `${label} must expose an accessible summary`
      );

      assert.ok(
        source.includes(
          label
        ),
        `${label} action must remain visible`
      );
    }
  }
);

test(
  "compact presentation preserves existing action handlers",
  () => {
    assert.ok(
      cases.includes(
        "createCase"
      )
    );

    assert.ok(
      batch.includes(
        "runBatch"
      )
    );

    assert.ok(
      alerts.includes(
        "createRule"
      )
    );

    assert.ok(
      dashboards.includes(
        "createDashboard"
      )
    );
  }
);

test(
  "batch quota safety copy remains visible",
  () => {
    assert.ok(
      batch.includes(
        "Each target uses the normal AYZO analysis quota."
      )
    );

    assert.ok(
      batch.includes(
        "Authentication, quota, rate-limit, load-guard and failed-analysis refund behavior are not bypassed."
      )
    );
  }
);
