import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plans =
  fs.readFileSync(
    "src/components/account/AccountPlanExperience.tsx",
    "utf8"
  );

const advanced =
  fs.readFileSync(
    "src/components/account/AccountAdvancedWorkspace.tsx",
    "utf8"
  );

test(
  "Free Pro and Advanced retain distinct premium visual tiers",
  () => {
    assert.ok(
      plans.includes(
        "from-cyan-500/[0.04]"
      )
    );

    assert.ok(
      plans.includes(
        "from-violet-500/[0.055]"
      )
    );

    assert.ok(
      plans.includes(
        "from-purple-500/[0.075]"
      )
    );
  }
);

test(
  "Advanced tooling avoids redundant workspace naming",
  () => {
    assert.ok(
      advanced.includes(
        "Investigation tools"
      )
    );

    assert.equal(
      advanced.includes(
        "Your advanced research workspace"
      ),
      false
    );
  }
);

test(
  "Advanced category helper remains compact",
  () => {
    assert.ok(
      advanced.includes(
        "flex flex-wrap items-center gap-x-3"
      )
    );

    assert.equal(
      advanced.includes(
        'mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/40'
      ),
      false
    );
  }
);

test(
  "Advanced inactive tabs remain readable",
  () => {
    assert.ok(
      advanced.includes(
        "text-zinc-400"
      )
    );

    assert.ok(
      advanced.includes(
        "bg-violet-500/15"
      )
    );
  }
);
