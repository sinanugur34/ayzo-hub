import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const workspace =
  fs.readFileSync(
    "src/components/account/AccountAdvancedWorkspace.tsx",
    "utf8"
  );

test(
  "account exposes compact shortcut navigation",
  () => {
    for (
      const anchor of [
        "#saved-analyses",
        "#watchlists",
        "#account-essentials",
        "#advanced-workspace",
      ]
    ) {
      assert.ok(
        account.includes(
          anchor
        ),
        `${anchor} shortcut must exist`
      );
    }
  }
);

test(
  "Advanced workspace uses accessible category tabs",
  () => {
    assert.ok(
      workspace.includes(
        'role="tablist"'
      )
    );

    assert.ok(
      workspace.includes(
        'role="tab"'
      )
    );

    assert.ok(
      workspace.includes(
        'role="tabpanel"'
      )
    );

    for (
      const label of [
        "Investigations",
        "Monitoring",
        "Automation",
        "Developer",
        "Customization",
      ]
    ) {
      assert.ok(
        workspace.includes(
          `label: "${label}"`
        ),
        `${label} tab must remain available`
      );
    }
  }
);

test(
  "Advanced account tools are grouped without removing feature gates",
  () => {
    const surfaces = [
      [
        "advancedWatchlists",
        "AdvancedWatchlistsPanel",
      ],
      [
        "compareInvestigations",
        "CompareInvestigationsPanel",
      ],
      [
        "cases",
        "CasesPanel",
      ],
      [
        "evidenceLocker",
        "EvidenceLockerPanel",
      ],
      [
        "batchAnalysis",
        "BatchAnalysisPanel",
      ],
      [
        "priorityAnalysis",
        "PriorityAnalysisPanel",
      ],
      [
        "customAlertRules",
        "CustomAlertRulesPanel",
      ],
      [
        "apiAccess",
        "ApiAccessPanel",
      ],
      [
        "customLabelsNotes",
        "CustomLabelsNotesPanel",
      ],
      [
        "noCodeDashboards",
        "NoCodeDashboardsPanel",
      ],
    ] as const;

    for (
      const [
        feature,
        component,
      ] of surfaces
    ) {
      assert.ok(
        account.includes(
          `"${feature}"`
        )
      );

      assert.ok(
        account.includes(
          `<${component} />`
        )
      );
    }
  }
);

test(
  "workspace initially opens investigation tools only",
  () => {
    assert.ok(
      workspace.includes(
        'useState<TabId>(\n      "investigations"'
      )
    );

    assert.ok(
      workspace.includes(
        "content[\n          activeTab\n        ]"
      )
    );
  }
);
