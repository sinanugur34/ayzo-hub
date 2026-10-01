import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  NETWORKS,
  NETWORK_IDS,
} from "@/lib/networks/registry";

const home =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

test(
  "Zcash and Algorand reports exist after public promotion",
  () => {
    assert.equal(
      fs.existsSync(
        "src/components/ZcashIntelligenceReport.tsx"
      ),
      true
    );

    assert.equal(
      fs.existsSync(
        "src/components/AlgorandIntelligenceReport.tsx"
      ),
      true
    );
  }
);

test(
  "Final Five are present in canonical live selection",
  () => {
    const finalFive = [
      "zcash",
      "algorand",
      "polkadot",
      "cosmos",
      "injective",
    ] as const;

    const liveNetworks =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      liveNetworks.length,
      30
    );

    for (
      const id of finalFive
    ) {
      assert.equal(
        NETWORKS[id].status,
        "live"
      );

      assert.equal(
        liveNetworks.includes(
          id
        ),
        true
      );
    }

    assert.equal(
      NETWORKS.near.status,
      "development"
    );
  }
);

test(
  "home derives selectable networks from canonical live registry state",
  () => {
    assert.ok(
      home.includes(
        "const LIVE_NETWORKS"
      )
    );

    assert.ok(
      home.includes(
        "NETWORK_IDS.filter"
      )
    );

    assert.match(
      home,
      /NETWORKS\s*\[\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\]\s*\.status\s*===\s*"live"/
    );

    assert.ok(
      home.includes(
        "LIVE_NETWORKS.map"
      )
    );
  }
);
