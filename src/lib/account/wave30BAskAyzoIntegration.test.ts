import assert from "node:assert/strict";
import test from "node:test";

import {
  getAskAyzoNetworkProfile,
} from "./askAyzoNetworkRegistry";

test(
  "NEAR uses native Ask AYZO evidence profile",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "near"
      );

    assert.equal(
      profile.adapter,
      "near"
    );

    assert.ok(
      profile.capabilities.includes(
        "transaction-history"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "authorities"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "funding"
      )
    );
  }
);

test(
  "Hedera uses native Ask AYZO evidence profile",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "hedera"
      );

    assert.equal(
      profile.adapter,
      "hedera"
    );

    assert.ok(
      profile.capabilities.includes(
        "transaction-history"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "authorities"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "relationships"
      )
    );
  }
);
