import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  planHasFeature,
  planHasRoadmapFeature,
} from "./registry";

const accountPage =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const panel =
  fs.readFileSync(
    "src/components/account/ApiAccessPanel.tsx",
    "utf8"
  );

test(
  "API Access is live only for Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "apiAccess"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "apiAccess"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "apiAccess"
      ),
      true
    );

    assert.equal(
      planHasRoadmapFeature(
        "advanced",
        "apiAccess"
      ),
      false
    );
  }
);

test(
  "Account exposes the Advanced API Access management surface",
  () => {
    assert.ok(
      accountPage.includes(
        'import ApiAccessPanel'
      )
    );

    assert.ok(
      accountPage.includes(
        "<ApiAccessPanel />"
      )
    );

    assert.ok(
      panel.includes(
        "/api/account/api-keys"
      )
    );

    assert.ok(
      panel.includes(
        "Save this key now"
      )
    );

    assert.ok(
      panel.includes(
        "AYZO will not show this secret again."
      )
    );

    assert.ok(
      panel.includes(
        "Revoke key"
      )
    );

    assert.ok(
      panel.includes(
        "/api/v1/intelligence"
      )
    );
  }
);
