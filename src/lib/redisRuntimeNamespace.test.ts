import assert from "node:assert/strict";
import test from "node:test";

import {
  redisRuntimePrefix,
} from "./redisRuntimeNamespace";

test(
  "production preserves historical Redis keys",
  () => {
    assert.equal(
      redisRuntimePrefix(
        "production"
      ),
      ""
    );
  }
);

test(
  "missing environment preserves production compatibility",
  () => {
    assert.equal(
      redisRuntimePrefix(
        undefined
      ),
      ""
    );
  }
);

test(
  "preview is isolated from production",
  () => {
    assert.equal(
      redisRuntimePrefix(
        "preview"
      ),
      "preview:"
    );
  }
);

test(
  "development is isolated from production",
  () => {
    assert.equal(
      redisRuntimePrefix(
        "development"
      ),
      "development:"
    );
  }
);

test(
  "unknown environment fails away from production namespace",
  () => {
    assert.equal(
      redisRuntimePrefix(
        "staging"
      ),
      "staging:"
    );
  }
);
