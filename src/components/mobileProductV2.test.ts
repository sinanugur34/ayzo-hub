import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const home =
  readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const globals =
  readFileSync(
    "src/app/globals.css",
    "utf8"
  );

test(
  "mobile analyzer keeps canonical registry-driven networks",
  () => {
    assert.ok(
      home.includes(
        "LIVE_NETWORKS.map"
      )
    );

    assert.ok(
      home.includes(
        'NETWORKS[id]'
      )
    );

    assert.ok(
      home.includes(
        '.status === "live"'
      )
    );
  }
);

test(
  "mobile analyzer exposes compact all-network picker",
  () => {
    assert.ok(
      home.includes(
        "data-mobile-network-menu"
      )
    );

    assert.ok(
      home.includes(
        "data-mobile-network-panel"
      )
    );

    assert.ok(
      home.includes(
        "data-mobile-network-grid"
      )
    );

    assert.ok(
      home.includes(
        "aria-pressed={active}"
      )
    );
  }
);

test(
  "mobile address entry no longer uses giant 200px field",
  () => {
    assert.ok(
      home.includes(
        'className="h-16 min-w-0 flex-1'
      )
    );

    assert.ok(
      !home.includes(
        'className="h-[200px] min-w-0 flex-1'
      )
    );

    assert.ok(
      home.includes(
        'enterKeyHint="go"'
      )
    );

    assert.ok(
      home.includes(
        'autoCapitalize="none"'
      )
    );
  }
);

test(
  "mobile analyze CTA becomes full-width touch target",
  () => {
    assert.ok(
      home.includes(
        'className="h-14 w-full rounded-xl bg-white'
      )
    );
  }
);

test(
  "mobile network selector has bounded scrolling",
  () => {
    assert.ok(
      globals.includes(
        "[data-mobile-network-panel]"
      )
    );

    assert.ok(
      globals.includes(
        "62dvh"
      )
    );

    assert.ok(
      globals.includes(
        "scroll-snap-type: x proximity"
      )
    );

    assert.ok(
      globals.includes(
        "@media (max-width: 370px)"
      )
    );
  }
);
