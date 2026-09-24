import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260924235500_advanced_no_code_dashboards_v1.sql",
    "utf8"
  );

const route =
  fs.readFileSync(
    "src/app/api/account/no-code-dashboards/route.ts",
    "utf8"
  );

const access =
  fs.readFileSync(
    "src/lib/account/noCodeDashboardsAccess.ts",
    "utf8"
  );

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

test(
  "dashboard storage is ownership safe",
  () => {
    assert.ok(
      migration.includes(
        "no_code_dashboard_widgets_analysis_owner_fk"
      )
    );

    assert.ok(
      migration.includes(
        "references public.saved_analyses"
      )
    );

    assert.ok(
      migration.includes(
        "enable row level security"
      )
    );

    assert.ok(
      migration.includes(
        "s.plan_id = 'advanced'"
      )
    );
  }
);

test(
  "No-Code Dashboards is activated through the Advanced registry gate",
  () => {
    assert.ok(
      access.includes(
        '"noCodeDashboards"'
      )
    );

    assert.ok(
      access.includes(
        "planHasFeature"
      )
    );

    assert.ok(
      route.includes(
        "PLAN_REQUIRED"
      )
    );

    assert.ok(
      registry.includes(
        "noCodeDashboards: true"
      )
    );

    const roadmapStart =
      registry.indexOf(
        "const ADVANCED_ROADMAP_FEATURES"
      );

    const roadmapEnd =
      registry.indexOf(
        "export const PLANS"
      );

    const roadmap =
      registry.slice(
        roadmapStart,
        roadmapEnd
      );

    assert.equal(
      roadmap.includes(
        '"noCodeDashboards"'
      ),
      false
    );
  }
);
