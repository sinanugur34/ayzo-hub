import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const home =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const desk =
  fs.readFileSync(
    "src/components/AppResearchDesk.tsx",
    "utf8"
  );

test(
  "home passes registry-backed LIVE_NETWORKS into the research desk",
  () => {
    assert.match(
      home,
      /liveNetworks=\{LIVE_NETWORKS\}/
    );

    assert.match(
      home,
      /NETWORK_IDS\.filter/
    );

    assert.match(
      home,
      /\.status === "live"/
    );
  }
);

test(
  "research desk renders its live-network count from the passed canonical array",
  () => {
    assert.match(
      desk,
      /\{\s*liveNetworks\.length\s*\}/
    );

    assert.match(
      desk,
      /LIVE NETWORKS/
    );

    assert.match(
      desk,
      /Network ·\{" "\}\s*\{\s*liveNetworks\.length\s*\}/
    );
  }
);

test(
  "network selector renders the supplied live network collection instead of a duplicated list",
  () => {
    assert.match(
      desk,
      /filteredNetworks\.map/
    );

    assert.match(
      desk,
      /const filteredNetworks/
    );

    assert.match(
      desk,
      /return liveNetworks/
    );
  }
);

test(
  "home and research desk contain no hardcoded live-network total",
  () => {
    const combined =
      `${home}\n${desk}`;

    assert.equal(
      /\b30\s+live networks\b/i.test(
        combined
      ),
      false
    );

    assert.equal(
      /\b17\s+networks\b/i.test(
        combined
      ),
      false
    );
  }
);
