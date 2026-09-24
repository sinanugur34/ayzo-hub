import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const workspaceRoute =
  fs.readFileSync(
    "src/app/api/account/custom-labels-notes/route.ts",
    "utf8"
  );

const mutationRoute =
  fs.readFileSync(
    "src/app/api/account/entity-annotations/route.ts",
    "utf8"
  );

const panel =
  fs.readFileSync(
    "src/components/account/CustomLabelsNotesPanel.tsx",
    "utf8"
  );

test(
  "Account exposes Advanced Custom Labels & Notes",
  () => {
    assert.ok(
      account.includes(
        "<CustomLabelsNotesPanel />"
      )
    );
  }
);

test(
  "workspace is Advanced gated owner scoped and no-store",
  () => {
    assert.ok(
      workspaceRoute.includes(
        "canUseCustomLabelsNotes"
      )
    );

    assert.ok(
      workspaceRoute.includes(
        '.eq(\n        "user_id",'
      )
    );

    assert.ok(
      workspaceRoute.includes(
        '"Cache-Control":\n          "no-store"'
      )
    );
  }
);

test(
  "workspace reuses existing annotation mutation API",
  () => {
    assert.ok(
      panel.includes(
        '"/api/account/entity-annotations"'
      )
    );

    assert.ok(
      mutationRoute.includes(
        '.eq(\n        "user_id",'
      )
    );

    assert.ok(
      mutationRoute.includes(
        '.from(\n        "entity_annotations"'
      )
    );
  }
);

test(
  "personal annotations remain distinct from AYZO verified labels",
  () => {
    assert.ok(
      panel.includes(
        "They are not AYZO-verified entity labels."
      )
    );
  }
);
