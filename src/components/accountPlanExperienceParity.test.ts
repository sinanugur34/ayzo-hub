import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const experience =
  fs.readFileSync(
    "src/components/account/AccountPlanExperience.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

test(
  "account exposes a plan-aware experience from canonical entitlement",
  () => {
    assert.ok(
      account.includes(
        "<AccountPlanExperience"
      )
    );

    assert.ok(
      account.includes(
        "entitlement.planId"
      )
    );

    assert.ok(
      experience.includes(
        "getPlan"
      )
    );

    assert.ok(
      experience.includes(
        "planHasFeature"
      )
    );
  }
);

test(
  "Free Pro and Advanced use distinct workspace hierarchy",
  () => {
    assert.ok(
      experience.includes(
        "FREE · CORE INTELLIGENCE"
      )
    );

    assert.ok(
      experience.includes(
        "PRO · RESEARCH WORKSPACE"
      )
    );

    assert.ok(
      experience.includes(
        "ADVANCED · INVESTIGATION WORKSPACE"
      )
    );
  }
);

test(
  "plan experience keeps canonical daily quotas",
  () => {
    assert.ok(
      registry.includes(
        'count: 3'
      )
    );

    assert.ok(
      registry.includes(
        'count: 25'
      )
    );

    assert.ok(
      registry.includes(
        'count: 90'
      )
    );

    assert.ok(
      experience.includes(
        "plan.analysisQuota.count"
      )
    );
  }
);

test(
  "roadmap rendering is derived from canonical roadmap registry",
  () => {
    assert.ok(
      experience.includes(
        "planHasRoadmapFeature"
      )
    );

    assert.ok(
      experience.includes(
        '"mobileApp"'
      )
    );

    assert.ok(
      registry.includes(
        'const PRO_ROADMAP_FEATURES = ['
      )
    );

    assert.ok(
      registry.includes(
        '"mobileApp"'
      )
    );
  }
);

test(
  "unsupported notification channels are not advertised by account plan experience",
  () => {
    assert.equal(
      experience.toLowerCase().includes(
        "telegram"
      ),
      false
    );

    assert.equal(
      experience.toLowerCase().includes(
        "browser notification"
      ),
      false
    );
  }
);

test(
  "network-specific capability copy remains evidence-aware",
  () => {
    assert.ok(
      experience.includes(
        "supported network coverage"
      )
    );

    assert.ok(
      experience.includes(
        "evidence actually observed"
      )
    );
  }
);
