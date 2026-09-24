import assert from "node:assert/strict";
import test from "node:test";

import {
  isEvidenceLockerUuid,
  parseEvidenceLockerCreateInput,
} from "./evidenceLocker";

const uuid =
  "11111111-2222-4333-8444-555555555555";

test(
  "Evidence Locker accepts a valid saved analysis UUID",
  () => {
    assert.equal(
      isEvidenceLockerUuid(
        uuid
      ),
      true
    );

    assert.deepEqual(
      parseEvidenceLockerCreateInput({
        savedAnalysisId:
          uuid,
      }),
      {
        savedAnalysisId:
          uuid,
      }
    );
  }
);

test(
  "Evidence Locker rejects invalid saved analysis IDs",
  () => {
    assert.equal(
      parseEvidenceLockerCreateInput({
        savedAnalysisId:
          "not-a-uuid",
      }),
      null
    );
  }
);
