import test from "node:test";
import assert from "node:assert/strict";

import {
  parseAlertRuleToggle,
  parseCreateAlertRule,
} from "./alertRules";

test(
  "accepts a basic watchlist alert rule",
  () => {
    const parsed =
      parseCreateAlertRule({
        watchlistId:
          "11111111-1111-4111-8111-111111111111",

        ruleType:
          "new_activity",
      });

    assert.ok(parsed);

    assert.equal(
      parsed.ruleType,
      "new_activity"
    );

    assert.equal(
      parsed.enabled,
      true
    );

    assert.equal(
      parsed.subjectType,
      null
    );
  }
);

test(
  "accepts a direct subject rule with network",
  () => {
    const parsed =
      parseCreateAlertRule({
        network:
          "ethereum",

        subjectType:
          "wallet",

        subjectValue:
          "0xabc",

        ruleType:
          "funding_movement",
      });

    assert.ok(parsed);

    assert.equal(
      parsed.network,
      "ethereum"
    );
  }
);

test(
  "rejects a targetless global rule",
  () => {
    assert.equal(
      parseCreateAlertRule({
        ruleType:
          "new_activity",
      }),
      null
    );
  }
);

test(
  "rejects unsupported custom rule types",
  () => {
    assert.equal(
      parseCreateAlertRule({
        watchlistId:
          "11111111-1111-4111-8111-111111111111",

        ruleType:
          "custom_whale_score",
      }),
      null
    );
  }
);

test(
  "requires network for a direct subject",
  () => {
    assert.equal(
      parseCreateAlertRule({
        subjectType:
          "wallet",

        subjectValue:
          "0xabc",

        ruleType:
          "new_activity",
      }),
      null
    );
  }
);

test(
  "toggle accepts booleans only",
  () => {
    assert.deepEqual(
      parseAlertRuleToggle({
        enabled:
          false,
      }),
      {
        enabled:
          false,
      }
    );

    assert.equal(
      parseAlertRuleToggle({
        enabled:
          "false",
      }),
      null
    );
  }
);
