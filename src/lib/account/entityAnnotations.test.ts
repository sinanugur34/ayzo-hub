import assert from "node:assert/strict";
import test from "node:test";

import {
  parseEntityAnnotationInput,
  parseEntityIdentity,
} from "./entityAnnotations";

test(
  "accepts and trims a valid label annotation",
  () => {
    const result =
      parseEntityAnnotationInput({
        network:
          "solana",
        subjectType:
          "wallet",
        subjectValue:
          "  wallet-123  ",
        label:
          "  Treasury  ",
        notes:
          "  Team-controlled funds  ",
        colorKey:
          "amber",
      });

    assert.deepEqual(
      result,
      {
        network:
          "solana",
        subjectType:
          "wallet",
        subjectValue:
          "wallet-123",
        label:
          "Treasury",
        notes:
          "Team-controlled funds",
        colorKey:
          "amber",
      }
    );
  }
);

test(
  "accepts note-only annotation",
  () => {
    const result =
      parseEntityAnnotationInput({
        network:
          "ethereum",
        subjectType:
          "wallet",
        subjectValue:
          "0x123",
        notes:
          "Needs review",
      });

    assert.equal(
      result?.label,
      null
    );

    assert.equal(
      result?.colorKey,
      "violet"
    );
  }
);

test(
  "rejects empty annotation",
  () => {
    assert.equal(
      parseEntityAnnotationInput({
        network:
          "base",
        subjectType:
          "token",
        subjectValue:
          "0xabc",
        label:
          "",
        notes:
          "",
      }),
      null
    );
  }
);

test(
  "rejects invalid color",
  () => {
    assert.equal(
      parseEntityAnnotationInput({
        network:
          "bitcoin",
        subjectType:
          "wallet",
        subjectValue:
          "bc1-test",
        label:
          "Whale",
        colorKey:
          "neon",
      }),
      null
    );
  }
);

test(
  "rejects unsupported subject type",
  () => {
    assert.equal(
      parseEntityIdentity({
        network:
          "solana",
        subjectType:
          "person",
        subjectValue:
          "abc",
      }),
      null
    );
  }
);
