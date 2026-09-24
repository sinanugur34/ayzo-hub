import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardSnapshot,
  parseAddWidgetInput,
  parseCreateDashboardInput,
} from "./noCodeDashboards";

test(
  "parses dashboard creation",
  () => {
    assert.deepEqual(
      parseCreateDashboardInput({
        action:
          "create_dashboard",
        name:
          "  Investigation  ",
      }),
      {
        name:
          "Investigation",
      }
    );

    assert.equal(
      parseCreateDashboardInput({
        action:
          "create_dashboard",
        name:
          "",
      }),
      null
    );
  }
);

test(
  "parses dashboard widget input",
  () => {
    const dashboardId =
      "11111111-1111-4111-8111-111111111111";

    const savedAnalysisId =
      "22222222-2222-4222-8222-222222222222";

    assert.deepEqual(
      parseAddWidgetInput({
        action:
          "add_widget",
        dashboardId,
        savedAnalysisId,
        widgetKind:
          "evidence",
      }),
      {
        dashboardId,
        savedAnalysisId,
        widgetKind:
          "evidence",
      }
    );
  }
);

test(
  "builds evidence-only snapshots",
  () => {
    assert.deepEqual(
      buildDashboardSnapshot({
        coverage:
          "partial",

        modules: {
          history: {},
          funding: {},
        },

        findings: [
          {},
          {},
        ],
      }),
      {
        coverage:
          "partial",
        topLevelKeyCount:
          3,
        moduleCount:
          2,
        findingsCount:
          2,
      }
    );
  }
);
