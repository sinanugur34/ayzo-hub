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
  "keeps existing GoldRush and Alchemy provider roles unchanged",
  () => {
    assert.equal(
      PROVIDERS.goldrush.kind,
      "indexed-data"
    );

    assert.equal(
      PROVIDERS.goldrush.role,
      "primary"
    );

    assert.equal(
      PROVIDERS.alchemy.kind,
      "rpc"
    );

    assert.equal(
      PROVIDERS.alchemy.role,
      "fallback"
    );
  }
);
