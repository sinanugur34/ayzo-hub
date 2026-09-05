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
  ALERT_RUNNER_LOCK_TTL_SECONDS,
  buildAlertRunnerLockKey,
  runWithAlertRunnerLease,
} =
  require(
    "./runnerSafety.ts"
  );

test(
  "production lock is isolated from preview",
  () => {
    const production =
      buildAlertRunnerLockKey(
        "production",
        undefined
      );

    const preview =
      buildAlertRunnerLockKey(
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
  "different preview branches use different locks",
  () => {
    const first =
      buildAlertRunnerLockKey(
        "preview",
        "feat/a"
      );

    const second =
      buildAlertRunnerLockKey(
        "preview",
        "feat/b"
      );

    assert.notEqual(
      first,
      second
    );
  }
);

test(
  "lock TTL is bounded and long enough for a small sequential batch",
  () => {
    assert.ok(
      ALERT_RUNNER_LOCK_TTL_SECONDS >=
        120
    );

    assert.ok(
      ALERT_RUNNER_LOCK_TTL_SECONDS <=
        900
    );
  }
);

test(
  "acquired lease executes exactly once and releases",
  async () => {
    let taskCalls = 0;
    let releaseCalls = 0;

    const result =
      await runWithAlertRunnerLease(
        {
          async acquire() {
            return {
              async release() {
                releaseCalls += 1;
                return true;
              },
            };
          },
        },
        async () => {
          taskCalls += 1;
          return "done";
        }
      );

    assert.deepEqual(
      result,
      {
        status: "executed",
        value: "done",
        released: true,
      }
    );

    assert.equal(
      taskCalls,
      1
    );

    assert.equal(
      releaseCalls,
      1
    );
  }
);

test(
  "overlapping execution is skipped before task work",
  async () => {
    let taskCalls = 0;

    const result =
      await runWithAlertRunnerLease(
        {
          async acquire() {
            return null;
          },
        },
        async () => {
          taskCalls += 1;
          return "should-not-run";
        }
      );

    assert.deepEqual(
      result,
      {
        status: "skipped",
        reason: "already_running",
      }
    );

    assert.equal(
      taskCalls,
      0
    );
  }
);

test(
  "task failure still attempts lock release",
  async () => {
    let releaseCalls = 0;

    await assert.rejects(
      runWithAlertRunnerLease(
        {
          async acquire() {
            return {
              async release() {
                releaseCalls += 1;
                return true;
              },
            };
          },
        },
        async () => {
          throw new Error(
            "expected"
          );
        }
      ),
      /expected/
    );

    assert.equal(
      releaseCalls,
      1
    );
  }
);

test(
  "release failure is surfaced without rerunning the task",
  async () => {
    let taskCalls = 0;

    const result =
      await runWithAlertRunnerLease(
        {
          async acquire() {
            return {
              async release() {
                return false;
              },
            };
          },
        },
        async () => {
          taskCalls += 1;
          return 42;
        }
      );

    assert.deepEqual(
      result,
      {
        status: "executed",
        value: 42,
        released: false,
      }
    );

    assert.equal(
      taskCalls,
      1
    );
  }
);

test(
  "lock acquisition failure prevents evaluator work",
  async () => {
    let taskCalls = 0;

    await assert.rejects(
      runWithAlertRunnerLease(
        {
          async acquire() {
            throw new Error(
              "redis unavailable"
            );
          },
        },
        async () => {
          taskCalls += 1;
          return "never";
        }
      ),
      /redis unavailable/
    );

    assert.equal(
      taskCalls,
      0
    );
  }
);
