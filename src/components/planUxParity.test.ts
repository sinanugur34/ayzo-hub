import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "plan comparison scopes network-specific Pro capabilities truthfully",
  () => {
    const matrix =
      fs.readFileSync(
        "src/components/PlanComparisonMatrix.tsx",
        "utf8"
      );

    assert.ok(
      matrix.includes(
        '"EVM Market & Flow Intelligence"'
      )
    );

    assert.ok(
      matrix.includes(
        '"AYZO Entity Labels · Solana + EVM V1"'
      )
    );

    assert.ok(
      matrix.includes(
        "Other networks may expose separate evidence-backed flow modules."
      )
    );

    assert.equal(
      matrix.includes(
        '"Market & Flow Intelligence"'
      ),
      false
    );
  }
);

test(
  "unsupported entity labels remain visible and truthful",
  () => {
    const source =
      fs.readFileSync(
        "src/components/AyzoEntityLabelsPanel.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "Not supported for this network"
      )
    );

    assert.ok(
      source.includes(
        "Solana and EVM analyses"
      )
    );

    assert.equal(
      source.includes(
        'state ===\n    "unsupported"\n  ) {\n    return null;'
      ),
      false
    );
  }
);

test(
  "alert rule copy matches active scheduled monitoring",
  () => {
    const source =
      fs.readFileSync(
        "src/components/account/AlertRulesPanel.tsx",
        "utf8"
      );

    assert.ok(
      source.includes(
        "scheduled monitoring cycle"
      )
    );

    assert.equal(
      source.includes(
        "Automated delivery is not active yet."
      ),
      false
    );
  }
);

test(
  "unsupported notification channels remain excluded from roadmap",
  () => {
    const matrix =
      fs.readFileSync(
        "src/components/PlanComparisonMatrix.tsx",
        "utf8"
      );

    const registry =
      fs.readFileSync(
        "src/lib/plans/registry.ts",
        "utf8"
      );

    assert.ok(
      matrix.includes(
        '"Browser notifications"'
      )
    );

    assert.ok(
      matrix.includes(
        '"Telegram notifications"'
      )
    );

    assert.ok(
      registry.includes(
        '"mobileApp"'
      )
    );

    assert.equal(
      registry.includes(
        '"browserNotifications"'
      ),
      false
    );

    assert.equal(
      registry.includes(
        '"telegramNotifications"'
      ),
      false
    );
  }
);
