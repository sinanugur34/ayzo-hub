import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "src/app/api/account/ask-ayzo/route.ts",
    "utf8"
  );

const semantic =
  fs.readFileSync(
    "src/lib/account/askAyzoSemantic.ts",
    "utf8"
  );

const helper =
  fs.readFileSync(
    "src/lib/account/askAyzoInvestigator.ts",
    "utf8"
  );

const assistant =
  fs.readFileSync(
    "src/components/AskAyzoAssistantProvider.tsx",
    "utf8"
  );

const panel =
  fs.readFileSync(
    "src/components/AskAyzoPanel.tsx",
    "utf8"
  );

const matrix =
  fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

test(
  "Investigator reads exact-subject evidence history with bounded queries",
  () => {
    assert.match(
      route,
      /\.from\(\s*"evidence_snapshots"\s*\)/
    );

    assert.match(
      route,
      /\.from\(\s*"saved_analyses"\s*\)/
    );

    assert.match(
      route,
      /\.eq\(\s*"user_id",\s*userId\s*\)/
    );

    assert.match(
      route,
      /\.eq\(\s*"network",\s*network\s*\)/
    );

    assert.match(
      route,
      /\.eq\(\s*"subject_type",\s*subjectType\s*\)/
    );

    assert.match(
      route,
      /\.eq\(\s*"subject_value",\s*subjectValue\s*\)/
    );

    const limits =
      route.match(
        /\.limit\(\s*8\s*\)/g
      ) ??
      [];

    assert.ok(
      limits.length >=
      2
    );
  }
);

test(
  "Investigator remains read-only against Evidence History",
  () => {
    assert.doesNotMatch(
      route,
      /\.insert\(/
    );

    assert.doesNotMatch(
      route,
      /\.update\(/
    );

    assert.doesNotMatch(
      route,
      /\.delete\(/
    );

    assert.match(
      helper,
      /maxEntries:\s*8/
    );

    assert.match(
      helper,
      /maxChangesPerEntry:\s*4/
    );
  }
);

test(
  "Semantic layer understands bounded longitudinal evidence without weakening grounding",
  () => {
    assert.match(
      semantic,
      /\$\.ayzoInvestigatorTimeline/
    );

    assert.match(
      semantic,
      /\$\.ayzoInvestigatorLabels/
    );

    assert.match(
      semantic,
      /Never turn chronology into an unsupported causal claim/
    );

    assert.match(
      semantic,
      /Every answered factual response must include one or more valid evidenceIds/
    );

    assert.match(
      semantic,
      /Do not infer real-world identity, ownership, control, malicious intent/
    );
  }
);

test(
  "Investigator UX exposes longitudinal investigation state",
  () => {
    assert.match(
      assistant,
      /What changed since earlier evidence\?/
    );

    assert.match(
      assistant,
      /ASK AYZO INVESTIGATOR/
    );

    assert.match(
      assistant,
      /INVESTIGATOR CONTEXT/
    );

    assert.match(
      assistant,
      /investigatorContext/
    );

    assert.match(
      panel,
      /ASK AYZO INVESTIGATOR/
    );

    assert.match(
      panel,
      /Open Investigator/
    );
  }
);

test(
  "Investigator keeps canonical Ask AYZO entitlement",
  () => {
    assert.match(
      matrix,
      /"Ask AYZO Investigator",\s*"askAyzo"/
    );

    assert.doesNotMatch(
      matrix,
      /"askAyzoInvestigator"/
    );
  }
);
