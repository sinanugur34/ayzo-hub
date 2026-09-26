import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout =
  fs.readFileSync(
    "src/app/layout.tsx",
    "utf8"
  );

test(
  "root metadata derives live network count from canonical network registry",
  () => {
    assert.ok(
      layout.includes(
        'from "@/lib/networks/registry"'
      )
    );

    assert.ok(
      layout.includes(
        "Object.values("
      )
    );

    assert.ok(
      layout.includes(
        "network.status ==="
      )
    );

    assert.ok(
      layout.includes(
        '"live"'
      )
    );

    assert.ok(
      layout.includes(
        "${LIVE_NETWORK_COUNT} live networks"
      )
    );
  }
);

test(
  "root metadata does not hardcode the current live network count",
  () => {
    assert.equal(
      layout.includes(
        "17 live networks"
      ),
      false
    );
  }
);

test(
  "SEO OpenGraph and Twitter descriptions share the dynamic live count",
  () => {
    const occurrences =
      layout.match(
        /\$\{LIVE_NETWORK_COUNT\} live networks/g
      ) ?? [];

    assert.equal(
      occurrences.length,
      3
    );
  }
);
