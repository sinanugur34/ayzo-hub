import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const accountPanel =
  fs.readFileSync(
    "src/components/account/AlertRulesPanel.tsx",
    "utf8"
  );

const quickAdd =
  fs.readFileSync(
    "src/components/SmartAlertQuickAdd.tsx",
    "utf8"
  );

const analysisActions =
  fs.readFileSync(
    "src/components/AnalysisActions.tsx",
    "utf8"
  );

const accountRoute =
  fs.readFileSync(
    "src/app/api/account/alert-rules/route.ts",
    "utf8"
  );

const support =
  fs.readFileSync(
    "src/lib/alerts/liveSupport.ts",
    "utf8"
  );

test(
  "Account presents Smart Alerts as evidence monitoring",
  () => {
    assert.match(
      accountPanel,
      /SMART ALERTS/
    );

    assert.match(
      accountPanel,
      /Evidence monitoring/
    );

    assert.match(
      accountPanel,
      /scheduled monitoring cycle/
    );

    assert.match(
      accountPanel,
      /Last checked/
    );

    assert.match(
      accountPanel,
      /Last evidence change/
    );

    assert.match(
      accountPanel,
      /DEFINITION ONLY/
    );
  }
);

test(
  "Analysis exposes direct Monitor changes without inventing unsupported networks",
  () => {
    assert.match(
      analysisActions,
      /SmartAlertQuickAdd/
    );

    assert.match(
      quickAdd,
      /Monitor changes/
    );

    assert.match(
      quickAdd,
      /getLiveSmartAlertRuleTypes/
    );

    assert.match(
      quickAdd,
      /\/api\/account\/alert-rules/
    );
  }
);

test(
  "Account API reports real Smart Alert runtime state",
  () => {
    assert.match(
      accountRoute,
      /alert_detection_state/
    );

    assert.match(
      accountRoute,
      /alert_events/
    );

    assert.match(
      accountRoute,
      /isResendAlertProviderReady/
    );

    assert.match(
      accountRoute,
      /smart_alerts_v2/
    );

    assert.match(
      accountRoute,
      /ALREADY_MONITORING/
    );

    assert.match(
      accountRoute,
      /MONITORING_NOT_LIVE/
    );
  }
);

test(
  "Smart Alert live network coverage comes from canonical registry",
  () => {
    assert.match(
      support,
      /NETWORK_IDS/
    );

    assert.match(
      support,
      /getNetwork/
    );

    assert.doesNotMatch(
      support,
      /const SMART_ALERT_NETWORK_OPTIONS = \[\s*"bitcoin"/
    );
  }
);
