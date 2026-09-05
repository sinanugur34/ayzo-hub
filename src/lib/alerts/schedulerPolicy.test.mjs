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
  isAlertSchedulerEnabled,
  isValidAlertCronAuthorization,
} =
  require(
    "./schedulerPolicy.ts"
  );

test(
  "scheduler is disabled unless explicitly true",
  () => {
    assert.equal(
      isAlertSchedulerEnabled(
        undefined
      ),
      false
    );

    assert.equal(
      isAlertSchedulerEnabled(
        ""
      ),
      false
    );

    assert.equal(
      isAlertSchedulerEnabled(
        "false"
      ),
      false
    );

    assert.equal(
      isAlertSchedulerEnabled(
        "1"
      ),
      false
    );

    assert.equal(
      isAlertSchedulerEnabled(
        "TRUE"
      ),
      true
    );

    assert.equal(
      isAlertSchedulerEnabled(
        " true "
      ),
      true
    );
  }
);

test(
  "valid bearer cron secret is accepted",
  () => {
    assert.equal(
      isValidAlertCronAuthorization(
        "Bearer example-secret",
        "example-secret"
      ),
      true
    );
  }
);

test(
  "wrong cron secret is rejected",
  () => {
    assert.equal(
      isValidAlertCronAuthorization(
        "Bearer wrong-secret",
        "example-secret"
      ),
      false
    );
  }
);

test(
  "missing authorization is rejected",
  () => {
    assert.equal(
      isValidAlertCronAuthorization(
        null,
        "example-secret"
      ),
      false
    );
  }
);

test(
  "missing configured secret fails closed",
  () => {
    assert.equal(
      isValidAlertCronAuthorization(
        "Bearer anything",
        undefined
      ),
      false
    );
  }
);

test(
  "non bearer authorization is rejected",
  () => {
    assert.equal(
      isValidAlertCronAuthorization(
        "Basic example-secret",
        "example-secret"
      ),
      false
    );
  }
);
