import assert from "node:assert/strict";
import test from "node:test";

import {
  getEvmDeepDeployerPolicy,
} from "./deepDeployerPolicy";

test(
  "deep deployer investigation is disabled for free",
  () => {
    assert.deepEqual(
      getEvmDeepDeployerPolicy(
        "free"
      ),
      {
        enabled: false,
      }
    );
  }
);

test(
  "deep deployer investigation is disabled for pro",
  () => {
    assert.deepEqual(
      getEvmDeepDeployerPolicy(
        "pro"
      ),
      {
        enabled: false,
      }
    );
  }
);

test(
  "deep deployer investigation uses bounded advanced limits",
  () => {
    assert.deepEqual(
      getEvmDeepDeployerPolicy(
        "advanced"
      ),
      {
        enabled: true,
        maxPages: 5,
        receiptCheckLimit: 12,
      }
    );
  }
);
