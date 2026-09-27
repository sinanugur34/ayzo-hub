import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const historical =
  fs.readFileSync(
    "src/components/HistoricalChangesPanel.tsx",
    "utf8"
  );

const tools =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceResearchTools.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/app/account/page.tsx",
    "utf8"
  );

const historyPanel =
  fs.readFileSync(
    "src/components/account/EvidenceHistoryPanel.tsx",
    "utf8"
  );

test(
  "Analysis communicates automatic Evidence Change tracking",
  () => {
    assert.match(
      historical,
      /Tracking automatically/
    );

    assert.match(
      historical,
      /Since your last analysis/
    );

    assert.match(
      historical,
      /Automatic baseline/
    );

    assert.match(
      tools,
      /Tracking automatically/
    );
  }
);

test(
  "Account exposes a dedicated Evidence History surface",
  () => {
    assert.match(
      account,
      /"historicalChanges"/
    );

    assert.match(
      account,
      /EvidenceHistoryPanel/
    );

    assert.match(
      account,
      /evidence_snapshots/
    );

    assert.match(
      historyPanel,
      /Evidence History/
    );

    assert.match(
      historyPanel,
      /EVIDENCE MEMORY/
    );

    assert.match(
      historyPanel,
      /AUTOMATIC/
    );
  }
);

test(
  "automatic Evidence History remains separate from Saved Analyses",
  () => {
    assert.match(
      historyPanel,
      /Manual Saved Analyses stay separate/
    );

    assert.match(
      account,
      /Saved Analyses/
    );
  }
);
