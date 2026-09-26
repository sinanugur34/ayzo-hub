import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const limit =
  fs.readFileSync(
    "src/components/AnalysisLimitCard.tsx",
    "utf8"
  );

const workspace =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceOverview.tsx",
    "utf8"
  );

test(
  "analysis limit UX distinguishes Free Pro and Advanced",
  () => {
    assert.ok(
      limit.includes(
        "FREE · CORE INTELLIGENCE"
      )
    );

    assert.ok(
      limit.includes(
        "PRO · RESEARCH WORKSPACE"
      )
    );

    assert.ok(
      limit.includes(
        "ADVANCED · INVESTIGATION WORKSPACE"
      )
    );
  }
);

test(
  "analysis limit UX derives quotas from canonical plans",
  () => {
    assert.ok(
      limit.includes(
        "PLANS"
      )
    );

    assert.ok(
      limit.includes(
        'quota(\n      "free"'
      )
    );

    assert.ok(
      limit.includes(
        'quota(\n      "pro"'
      )
    );

    assert.ok(
      limit.includes(
        'quota(\n      "advanced"'
      )
    );
  }
);

test(
  "Pro limit offers Advanced instead of Pro again",
  () => {
    assert.ok(
      limit.includes(
        "Upgrade to Advanced"
      )
    );
  }
);

test(
  "Advanced limit does not invent a higher individual tier",
  () => {
    assert.ok(
      limit.includes(
        "No higher individual plan is presented here."
      )
    );
  }
);

test(
  "analysis workspace badges match Account V2 tier language",
  () => {
    assert.ok(
      workspace.includes(
        '"Core Intelligence."'
      )
    );

    assert.ok(
      workspace.includes(
        '"Research Workspace."'
      )
    );

    assert.ok(
      workspace.includes(
        '"Investigation Workspace."'
      )
    );

    assert.ok(
      workspace.includes(
        "border-cyan-500/20"
      )
    );

    assert.ok(
      workspace.includes(
        "border-violet-500/25"
      )
    );

    assert.ok(
      workspace.includes(
        "border-purple-500/30"
      )
    );
  }
);
