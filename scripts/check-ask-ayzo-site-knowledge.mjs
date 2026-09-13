import {
  readFile,
  access,
} from "node:fs/promises";

const checks = [
  {
    file:
      "src/app/page.tsx",

    markers: [
      "HeaderAuthControls",
      "PricingPlans",
    ],
  },

  {
    file:
      "src/components/auth/HeaderAuthControls.tsx",

    markers: [
      'href="/account"',
      "Account",
    ],
  },

  {
    file:
      "src/app/account/page.tsx",

    markers: [
      "Saved Analyses",
      "Watchlists",
      "AlertRulesPanel",
    ],
  },

  {
    file:
      "src/components/AnalysisActions.tsx",

    markers: [
      "AyzoEntityLabelsPanel",
      "HistoricalChangesPanel",
      "InvestigationTimelinePanel",
    ],
  },
];

let failed =
  false;

for (
  const check
  of checks
) {
  try {
    await access(
      check.file
    );

    const source =
      await readFile(
        check.file,
        "utf8"
      );

    for (
      const marker
      of check.markers
    ) {
      if (
        !source.includes(
          marker
        )
      ) {
        console.error(
          `MISSING MARKER: ${check.file} -> ${marker}`
        );

        failed =
          true;
      }
    }
  } catch {
    console.error(
      `MISSING FILE: ${check.file}`
    );

    failed =
      true;
  }
}

if (failed) {
  console.error(
    "ASK AYZO SITE KNOWLEDGE: STALE"
  );

  process.exit(1);
}

console.log(
  "ASK AYZO SITE KNOWLEDGE: PASS"
);
