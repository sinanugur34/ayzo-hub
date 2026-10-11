import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page =
  readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const desk =
  readFileSync(
    "src/components/AppResearchDesk.tsx",
    "utf8"
  );

const styles =
  readFileSync(
    "src/components/AppResearchDesk.module.css",
    "utf8"
  );

const access =
  readFileSync(
    "src/components/FreePlanStatus.tsx",
    "utf8"
  );

test(
  "approved research desk drives only the existing analysis surface",
  () => {
    assert.match(
      page,
      /<AppResearchDesk/
    );

    assert.match(
      page,
      /onSubmit=\{\s*handleAnalyze/
    );

    assert.match(
      page,
      /onNetworkChange=\{\s*selectNetwork/
    );

    assert.match(
      page,
      /liveNetworks=\{LIVE_NETWORKS\}/
    );
  }
);

test(
  "canonical live registry remains the network source",
  () => {
    assert.match(
      page,
      /NETWORK_IDS\.filter/
    );

    assert.match(
      page,
      /\.status === "live"/
    );

    assert.match(
      desk,
      /liveNetworks\.length/
    );

    assert.match(
      desk,
      /NETWORKS\[id\]/
    );
  }
);

test(
  "real address detection engine remains in the home controller",
  () => {
    assert.doesNotMatch(
      desk,
      /\/api\/address-detect/
    );

    assert.match(
      page,
      /"\/api\/address-detect"/
    );

    assert.match(
      page,
      /resolveSelectedNetworkForAddress/
    );
  }
);

test(
  "approved AYZO visual language is present",
  () => {
    assert.match(
      desk,
      /Start your investigation\./
    );

    assert.match(
      desk,
      /YOUR RESEARCH DESK/
    );

    assert.match(
      desk,
      /Automatic network detection/
    );

    assert.match(
      desk,
      /Which address should I use\?/
    );

    assert.match(
      styles,
      /#0b1020/
    );

    assert.match(
      styles,
      /#baa7ff/
    );

    assert.match(
      styles,
      /#a8fcdb/
    );

    assert.match(
      styles,
      /Manrope/
    );
  }
);

test(
  "fine interaction layer includes dismiss and accessibility states",
  () => {
    assert.match(
      desk,
      /AYZO_NETWORK_DISMISS_V1/
    );

    assert.match(
      desk,
      /pointerdown/
    );

    assert.match(
      desk,
      /event\.key !==\s*"Escape"/
    );

    assert.match(
      desk,
      /aria-busy/
    );

    assert.match(
      desk,
      /aria-invalid/
    );

    assert.match(
      styles,
      /overscroll-behavior:\s*contain/
    );

    assert.match(
      styles,
      /safe-area-inset-bottom/
    );

    assert.match(
      styles,
      /prefers-reduced-motion/
    );
  }
);

test(
  "quota and access remain server-backed",
  () => {
    assert.match(
      access,
      /\/api\/free\/status\?network=/
    );

    assert.match(
      access,
      /status\.remaining/
    );

    assert.match(
      access,
      /status\.networkRemaining/
    );

    assert.match(
      access,
      /#ayzo-plans-access-trigger/
    );

    assert.match(
      page,
      /id="ayzo-plans-access-trigger"/
    );
  }
);

test(
  "preview-only fake product controls were not imported",
  () => {
    assert.doesNotMatch(
      desk,
      /Önizleme: kullanıcı paketi/
    );

    assert.doesNotMatch(
      desk,
      /Design preview/
    );

    assert.doesNotMatch(
      desk,
      /no live analysis is run/
    );
  }
);
