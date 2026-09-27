import assert from "node:assert/strict";
import test from "node:test";

import {
  SMART_ALERT_NETWORK_OPTIONS,
  classifySmartAlertRuntime,
  getLiveSmartAlertRuleTypes,
} from "./liveSupport";

test(
  "Smart Alert network options derive Bitcoin and EVM networks from registry",
  () => {
    const ids =
      SMART_ALERT_NETWORK_OPTIONS
        .map(
          item =>
            item.id
        );

    assert.ok(
      ids.includes(
        "bitcoin"
      )
    );

    assert.ok(
      ids.includes(
        "ethereum"
      )
    );

    assert.equal(
      ids.includes(
        "solana"
      ),
      false
    );

    assert.equal(
      ids.includes(
        "tron"
      ),
      false
    );
  }
);

test(
  "EVM wallet and token subjects support all four Smart Alert types",
  () => {
    for (
      const subjectType of [
        "wallet",
        "token",
      ]
    ) {
      assert.deepEqual(
        getLiveSmartAlertRuleTypes(
          "ethereum",
          subjectType
        ),
        [
          "new_activity",
          "funding_movement",
          "relationship_change",
          "contract_activity",
        ]
      );
    }
  }
);

test(
  "Bitcoin wallet support excludes contract alerts",
  () => {
    assert.deepEqual(
      getLiveSmartAlertRuleTypes(
        "bitcoin",
        "wallet"
      ),
      [
        "new_activity",
        "funding_movement",
        "relationship_change",
      ]
    );

    assert.deepEqual(
      getLiveSmartAlertRuleTypes(
        "bitcoin",
        "token"
      ),
      []
    );
  }
);

test(
  "unsupported native networks are never presented as live monitoring",
  () => {
    assert.deepEqual(
      getLiveSmartAlertRuleTypes(
        "solana",
        "token"
      ),
      []
    );

    assert.deepEqual(
      getLiveSmartAlertRuleTypes(
        "tron",
        "wallet"
      ),
      []
    );

    assert.deepEqual(
      getLiveSmartAlertRuleTypes(
        "xrp",
        "wallet"
      ),
      []
    );
  }
);

test(
  "legacy watchlist alert rules remain definition only",
  () => {
    assert.equal(
      classifySmartAlertRuntime({
        watchlistId:
          "watchlist",

        network:
          null,

        subjectType:
          null,

        ruleType:
          "new_activity",
      }),
      "definition_only"
    );
  }
);

test(
  "direct supported rules are live and unsupported rules fail closed",
  () => {
    assert.equal(
      classifySmartAlertRuntime({
        watchlistId:
          null,

        network:
          "ethereum",

        subjectType:
          "wallet",

        ruleType:
          "funding_movement",
      }),
      "live"
    );

    assert.equal(
      classifySmartAlertRuntime({
        watchlistId:
          null,

        network:
          "bitcoin",

        subjectType:
          "wallet",

        ruleType:
          "contract_activity",
      }),
      "unsupported"
    );
  }
);
