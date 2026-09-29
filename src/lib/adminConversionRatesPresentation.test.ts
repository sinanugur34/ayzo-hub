import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "src/app/admin/page.tsx",
    "utf8"
  );

test(
  "Admin exposes directional funnel rates without claiming strict cohort conversion",
  () => {
    for (
      const label of [
        "Session → analyze",
        "Submit → start",
        "Start → complete",
        "Submit → complete",
        "Session → pricing",
        "Pricing → checkout",
        "Checkout → created",
        "Created → verified paid",
      ]
    ) {
      assert.match(
        page,
        new RegExp(
          label
            .replace(
              "→",
              "→"
            )
        )
      );
    }

    assert.match(
      page,
      /DIRECTIONAL RATES · 7 DAYS/
    );

    assert.match(
      page,
      /not strict same-session cohorts/
    );

    assert.match(
      page,
      /conversionRates30d/
    );
  }
);
