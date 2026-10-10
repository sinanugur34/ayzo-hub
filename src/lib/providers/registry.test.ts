import assert from "node:assert/strict";
import test from "node:test";

import {
  getProvider,
  PROVIDERS,
} from "./registry";

test(
  "registers Blockchair as indexed Dogecoin history provider",
  () => {
    assert.equal(
      PROVIDERS.blockchair.id,
      "blockchair"
    );

    assert.equal(
      PROVIDERS.blockchair.kind,
      "indexed-data"
    );

    assert.equal(
      PROVIDERS.blockchair.role,
      "primary"
    );

    assert.deepEqual(
      getProvider(
        "blockchair"
      ),
      PROVIDERS.blockchair
    );
  }
);

test(
  "retired GoldRush has no selectable provider definition",
  () => {
    assert.equal(getProvider("goldrush"), null);
    assert.equal("goldrush" in PROVIDERS, false);
    assert.equal(PROVIDERS.alchemy.kind, "rpc");
    assert.equal(PROVIDERS.alchemy.role, "fallback");
  }
);

test(
  "registers Ankr as indexed primary provider",
  () => {
    assert.equal(
      PROVIDERS.ankr.id,
      "ankr"
    );

    assert.equal(
      PROVIDERS.ankr.kind,
      "indexed-data"
    );

    assert.equal(
      PROVIDERS.ankr.role,
      "primary"
    );

    assert.deepEqual(
      getProvider("ankr"),
      PROVIDERS.ankr
    );
  }
);
