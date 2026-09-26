import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const accountPage =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const advancedSurfaces = [
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
    "customLabelsNotes",
    "CustomLabelsNotesPanel",
  ],
  [
    "apiAccess",
    "ApiAccessPanel",
  ],
  [
    "noCodeDashboards",
    "NoCodeDashboardsPanel",
  ],
  [
    "priorityAnalysis",
    "PriorityAnalysisPanel",
  ],
  [
    "customAlertRules",
    "CustomAlertRulesPanel",
  ],
] as const;

test(
  "Advanced account surfaces are server-gated by the canonical plan registry",
  () => {
    assert.ok(
      accountPage.includes(
        'getServerEntitlement'
      )
    );

    assert.ok(
      accountPage.includes(
        'planHasFeature'
      )
    );

    assert.ok(
      accountPage.includes(
        'billingAvailable &&'
      )
    );

    for (
      const [
        feature,
        panel,
      ] of advancedSurfaces
    ) {
      assert.ok(
        accountPage.includes(
          `accountFeatureEnabled(
          "${feature}"
        )`
        ),
        `${feature} must be gated`
      );

      assert.ok(
        accountPage.includes(
          `<${panel} />`
        ),
        `${panel} must remain mounted for eligible users`
      );
    }
  }
);

test(
  "Universal account security remains available independent of paid plan",
  () => {
    assert.ok(
      accountPage.includes(
        "<DeviceSecurityPanel />"
      )
    );

    assert.equal(
      accountPage.includes(
        `accountFeatureEnabled(
          "deviceSecurity"`
      ),
      false
    );
  }
);

test(
  "Pro alert management keeps its existing account surface",
  () => {
    assert.ok(
      accountPage.includes(
        "<AlertRulesPanel />"
      )
    );

    /*
     * AlertRulesPanel intentionally owns
     * Free vs Pro/Advanced management UX.
     * The API remains the authority for writes.
     */
    assert.equal(
      accountPage.includes(
        `accountFeatureEnabled(
          "alerts"
        ) && (
          <AlertRulesPanel />`
      ),
      false
    );
  }
);
