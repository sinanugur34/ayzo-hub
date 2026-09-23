import assert from "node:assert/strict";
import test from "node:test";

import {
  isCaseUuid,
  parseCaseAnalysisLinkInput,
  parseCaseCreateInput,
  parseCaseUpdateInput,
} from "./cases";

const uuid =
  "11111111-2222-4333-8444-555555555555";

test(
  "parses a bounded case create request",
  () => {
    assert.deepEqual(
      parseCaseCreateInput({
        name:
          "  Exchange investigation  ",
        description:
          "  Related wallets  ",
      }),
      {
        name:
          "Exchange investigation",
        description:
          "Related wallets",
      }
    );
  }
);

test(
  "rejects an empty case name",
  () => {
    assert.equal(
      parseCaseCreateInput({
        name:
          "   ",
      }),
      null
    );
  }
);

test(
  "accepts open and closed case status updates",
  () => {
    assert.deepEqual(
      parseCaseUpdateInput({
        status:
          "closed",
      }),
      {
        status:
          "closed",
      }
    );

    assert.deepEqual(
      parseCaseUpdateInput({
        status:
          "open",
      }),
      {
        status:
          "open",
      }
    );
  }
);

test(
  "rejects unsupported case status",
  () => {
    assert.equal(
      parseCaseUpdateInput({
        status:
          "archived",
      }),
      null
    );
  }
);

test(
  "validates saved analysis links as UUIDs",
  () => {
    assert.equal(
      isCaseUuid(uuid),
      true
    );

    assert.deepEqual(
      parseCaseAnalysisLinkInput({
        savedAnalysisId:
          uuid,
      }),
      {
        savedAnalysisId:
          uuid,
      }
    );

    assert.equal(
      parseCaseAnalysisLinkInput({
        savedAnalysisId:
          "not-a-uuid",
      }),
      null
    );
  }
);
