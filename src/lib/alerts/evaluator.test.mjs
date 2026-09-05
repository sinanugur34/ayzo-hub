import test from "node:test";
import assert from "node:assert/strict";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  planDirectActivityTarget,
  selectEligibleProUserIds,
} = require("./evaluator.ts");


function subscription(
  userId,
  overrides = {}
) {
  return {
    user_id:
      userId,

    plan_id:
      "pro",

    billing_interval:
      "monthly",

    status:
      "active",

    locked_price_usd_cents:
      1900,

    current_period_end:
      "2030-01-01T00:00:00.000Z",

    cancel_at_period_end:
      false,

    founding_customer:
      true,

    ...overrides,
  };
}


function rule(
  overrides = {}
) {
  return {
    id:
      "11111111-1111-4111-8111-111111111111",

    userId:
      "22222222-2222-4222-8222-222222222222",

    network:
      "ethereum",

    subjectType:
      "wallet",

    subjectValue:
      "0x1111111111111111111111111111111111111111",

    ruleType:
      "new_activity",

    enabled:
      true,

    ...overrides,
  };
}


test(
  "active and canceling valid Pro users are eligible",
  () => {
    const result =
      selectEligibleProUserIds(
        [
          subscription(
            "active"
          ),

          subscription(
            "canceling",
            {
              status:
                "canceling",
            }
          ),

          subscription(
            "expired",
            {
              current_period_end:
                "2020-01-01T00:00:00.000Z",
            }
          ),

          subscription(
            "past-due",
            {
              status:
                "past_due",
            }
          ),

          subscription(
            "advanced",
            {
              plan_id:
                "advanced",
            }
          ),
        ],
        new Date(
          "2026-09-05T12:00:00.000Z"
        )
      );

    assert.equal(
      result.has(
        "active"
      ),
      true
    );

    assert.equal(
      result.has(
        "canceling"
      ),
      true
    );

    assert.equal(
      result.has(
        "expired"
      ),
      false
    );

    assert.equal(
      result.has(
        "past-due"
      ),
      false
    );

    assert.equal(
      result.has(
        "advanced"
      ),
      false
    );
  }
);


test(
  "EVM wallet new activity is supported",
  () => {
    assert.equal(
      planDirectActivityTarget(
        rule()
      ).status,
      "ready"
    );
  }
);


test(
  "EVM token new activity is supported",
  () => {
    assert.equal(
      planDirectActivityTarget(
        rule({
          subjectType:
            "token",
        })
      ).status,
      "ready"
    );
  }
);


test(
  "Bitcoin wallet new activity is supported",
  () => {
    assert.equal(
      planDirectActivityTarget(
        rule({
          network:
            "bitcoin",

          subjectType:
            "wallet",

          subjectValue:
            "bc1qexample",
        })
      ).status,
      "ready"
    );
  }
);


test(
  "Solana fails closed",
  () => {
    assert.deepEqual(
      planDirectActivityTarget(
        rule({
          network:
            "solana",

          subjectType:
            "token",
        })
      ),
      {
        status:
          "skip",

        reason:
          "unsupported_network",
      }
    );
  }
);


test(
  "unsupported Bitcoin subject fails closed",
  () => {
    assert.deepEqual(
      planDirectActivityTarget(
        rule({
          network:
            "bitcoin",

          subjectType:
            "token",
        })
      ),
      {
        status:
          "skip",

        reason:
          "unsupported_subject",
      }
    );
  }
);
