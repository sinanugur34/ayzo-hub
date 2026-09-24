import assert from "node:assert/strict";
import test from "node:test";

import {
  planHasPriorityAnalysis,
  resolveAnalysisAdmissionPolicy,
} from "@/lib/analysisPriorityPolicy";

test(
  "Priority Analysis belongs only to Advanced",
  () => {
    assert.equal(
      planHasPriorityAnalysis(
        "free"
      ),
      false
    );

    assert.equal(
      planHasPriorityAnalysis(
        "pro"
      ),
      false
    );

    assert.equal(
      planHasPriorityAnalysis(
        "advanced"
      ),
      true
    );
  }
);

test(
  "standard traffic leaves reserved global capacity for Priority Analysis",
  () => {
    const standard =
      resolveAnalysisAdmissionPolicy({
        hardGlobalLimit:
          50,

        clientLimit:
          2,

        priorityReserve:
          5,

        priority:
          false,
      });

    const advanced =
      resolveAnalysisAdmissionPolicy({
        hardGlobalLimit:
          50,

        clientLimit:
          2,

        priorityReserve:
          5,

        priority:
          true,
      });

    assert.equal(
      standard
        .globalAdmissionLimit,
      45
    );

    assert.equal(
      advanced
        .globalAdmissionLimit,
      50
    );

    assert.equal(
      advanced
        .hardGlobalLimit,
      50
    );

    assert.equal(
      standard
        .clientLimit,
      2
    );

    assert.equal(
      advanced
        .clientLimit,
      2
    );
  }
);

test(
  "Priority Analysis never raises the hard system capacity",
  () => {
    const policy =
      resolveAnalysisAdmissionPolicy({
        hardGlobalLimit:
          3,

        clientLimit:
          2,

        priorityReserve:
          99,

        priority:
          true,
      });

    assert.equal(
      policy.hardGlobalLimit,
      3
    );

    assert.equal(
      policy.globalAdmissionLimit,
      3
    );

    assert.equal(
      policy.reservedSlots,
      2
    );
  }
);
