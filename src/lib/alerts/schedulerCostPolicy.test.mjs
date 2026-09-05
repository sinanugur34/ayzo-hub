import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(
    import.meta.url
  );

const {
  ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
  ALERT_SCHEDULER_MAX_RUNS_PER_DAY,
  ALERT_SCHEDULER_MAX_RULES_PER_RUN,
  ALERT_SCHEDULER_MAX_RULE_EVALUATIONS_PER_DAY,
  buildAlertSchedulerCadenceKey,
} =
  require(
    "./schedulerCostPolicy.ts"
  );

const {
  MAX_ALERT_RULES_PER_RUN,
} =
  require(
    "./evaluator.ts"
  );

test(
  "scheduler cadence is one hour",
  () => {
    assert.equal(
      ALERT_SCHEDULER_MIN_INTERVAL_SECONDS,
      3600
    );
  }
);

test(
  "scheduler daily run ceiling is 24",
  () => {
    assert.equal(
      ALERT_SCHEDULER_MAX_RUNS_PER_DAY,
      24
    );
  }
);

test(
  "scheduler rule budget matches bounded evaluator",
  () => {
    assert.equal(
      ALERT_SCHEDULER_MAX_RULES_PER_RUN,
      2
    );

    assert.equal(
      ALERT_SCHEDULER_MAX_RULES_PER_RUN,
      MAX_ALERT_RULES_PER_RUN
    );
  }
);

test(
  "daily rule evaluation ceiling is 48",
  () => {
    assert.equal(
      ALERT_SCHEDULER_MAX_RULE_EVALUATIONS_PER_DAY,
      48
    );
  }
);

test(
  "production and preview cadence keys are isolated",
  () => {
    const production =
      buildAlertSchedulerCadenceKey(
        "production",
        undefined
      );

    const preview =
      buildAlertSchedulerCadenceKey(
        "preview",
        "feat/pro-retention-wave-1"
      );

    assert.notEqual(
      production,
      preview
    );

    assert.match(
      production,
      /:production$/
    );

    assert.match(
      preview,
      /:preview:feat_pro-retention-wave-1$/
    );
  }
);

test(
  "preview branches have independent cadence windows",
  () => {
    assert.notEqual(
      buildAlertSchedulerCadenceKey(
        "preview",
        "feat/a"
      ),
      buildAlertSchedulerCadenceKey(
        "preview",
        "feat/b"
      )
    );
  }
);
