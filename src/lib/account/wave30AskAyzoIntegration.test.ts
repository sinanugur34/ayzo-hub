import assert from "node:assert/strict";
import test from "node:test";

import {
  getAskAyzoNetworkProfile,
} from "./askAyzoNetworkRegistry";

test(
  "Cardano uses native Ask AYZO evidence profile",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "cardano"
      );

    assert.equal(
      profile.adapter,
      "cardano"
    );

    assert.ok(
      profile.capabilities.includes(
        "relationships"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "funding"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "canonical-transaction"
      )
    );

    assert.ok(
      profile.suggestedQuestions.length >=
        3
    );
  }
);

test(
  "Aptos uses native Ask AYZO evidence profile",
  () => {
    const profile =
      getAskAyzoNetworkProfile(
        "aptos"
      );

    assert.equal(
      profile.adapter,
      "aptos"
    );

    assert.ok(
      profile.capabilities.includes(
        "relationships"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "funding"
      )
    );

    assert.ok(
      profile.capabilities.includes(
        "resource-usage"
      )
    );

    assert.ok(
      profile.suggestedQuestions.length >=
        3
    );
  }
);
