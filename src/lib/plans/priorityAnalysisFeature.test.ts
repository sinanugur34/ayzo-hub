import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

const webRoute =
  fs.readFileSync(
    "src/app/api/intelligence/route.ts",
    "utf8"
  );

const apiRoute =
  fs.readFileSync(
    "src/app/api/v1/intelligence/route.ts",
    "utf8"
  );

const loadGuard =
  fs.readFileSync(
    "src/lib/analysisLoadGuard.ts",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const panel =
  fs.readFileSync(
    "src/components/account/PriorityAnalysisPanel.tsx",
    "utf8"
  );

test(
  "Priority Analysis is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "priorityAnalysis"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "priorityAnalysis"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "priorityAnalysis"
      ),
      true
    );

    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "priorityAnalysis"
      ),
      false
    );
  }
);

test(
  "web and API intelligence use the priority-aware load guard",
  () => {
    assert.ok(
      webRoute.includes(
        "getWebAnalysisPriority"
      )
    );

    assert.ok(
      webRoute.includes(
        "priority:"
      )
    );

    assert.ok(
      apiRoute.includes(
        "planHasPriorityAnalysis"
      )
    );

    assert.ok(
      loadGuard.includes(
        "AYZO_ANALYSIS_PRIORITY_RESERVE"
      )
    );

    assert.ok(
      loadGuard.includes(
        "globalAdmissionLimit"
      )
    );
  }
);

test(
  "Account exposes Priority Analysis status",
  () => {
    assert.ok(
      account.includes(
        "PriorityAnalysisPanel"
      )
    );

    assert.ok(
      panel.includes(
        "/api/account/priority-analysis"
      )
    );

    assert.ok(
      panel.includes(
        "Priority Analysis"
      )
    );

    assert.ok(
      panel.includes(
        "Active"
      )
    );
  }
);
