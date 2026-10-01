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
  "Zcash and Algorand reports exist before public promotion",
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
  "development expansion networks remain outside canonical live selection",
  () => {
    assert.equal(
      NETWORKS.zcash.status,
      "development"
    );

    assert.equal(
      NETWORKS.algorand.status,
      "development"
    );

    const liveNetworks =
      NETWORK_IDS.filter(
        id =>
          NETWORKS[id].status ===
            "live"
      );

    assert.equal(
      liveNetworks.length,
      25
    );

    assert.equal(
      liveNetworks.includes(
        "zcash"
      ),
      false
    );

    assert.equal(
      liveNetworks.includes(
        "algorand"
      ),
      false
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

    /*
     * Keep this assertion formatting- and
     * variable-name tolerant. What matters is
     * that the home selector derives its set
     * from NETWORKS[*].status === "live".
     */
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
