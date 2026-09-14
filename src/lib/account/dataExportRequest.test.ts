import assert from "node:assert/strict";
import test from "node:test";

import {
  handleDataExportRequest,
} from "./dataExportRequest";

const validBody = {
  network:
    "ethereum",

  subjectType:
    "wallet",

  subjectValue:
    "0x1111111111111111111111111111111111111111",

  title:
    "Ethereum Wallet Analysis",

  format:
    "json",

  currentSnapshot: {
    version:
      1,

    capturedAt:
      "2026-09-14T08:00:00.000Z",

    network:
      "ethereum",

    coverage:
      "partial",

    subjectKind:
      "wallet",

    metrics: {
      moduleTotal:
        4,

      moduleComplete:
        3,

      moduleLimited:
        1,
    },

    modules: {
      walletGraph:
        "complete",
    },

    findings:
      [],
  },
};

test(
  "unauthenticated export is rejected",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          false,

        planId:
          "pro",

        body:
          validBody,
      });

    assert.equal(
      result.status,
      401
    );
  }
);

test(
  "Free export is rejected server-side",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          true,

        planId:
          "free",

        body:
          validBody,
      });

    assert.equal(
      result.status,
      403
    );

    assert.deepEqual(
      result.body,
      {
        error:
          "Data Export requires AYZO Pro or Advanced.",

        code:
          "PLAN_REQUIRED",
      }
    );
  }
);

test(
  "unsupported export format is rejected",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body: {
          ...validBody,
          format:
            "pdf",
        },
      });

    assert.equal(
      result.status,
      400
    );
  }
);

test(
  "snapshot network mismatch is rejected",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body: {
          ...validBody,
          network:
            "base",
        },
      });

    assert.equal(
      result.status,
      400
    );
  }
);

test(
  "Pro generates JSON export",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          true,

        planId:
          "pro",

        body:
          validBody,

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      result.status,
      200
    );

    if (
      result.status !==
      200
    ) {
      throw new Error(
        "Expected successful Pro export."
      );
    }

    assert.equal(
      result.body.export.format,
      "json"
    );

    assert.match(
      result.body.export.filename,
      /\.json$/
    );
  }
);

test(
  "Advanced inherits CSV export",
  () => {
    const result =
      handleDataExportRequest({
        authenticated:
          true,

        planId:
          "advanced",

        body: {
          ...validBody,
          format:
            "csv",
        },

        generatedAt:
          "2026-09-14T09:00:00.000Z",
      });

    assert.equal(
      result.status,
      200
    );

    if (
      result.status !==
      200
    ) {
      throw new Error(
        "Expected successful Advanced export."
      );
    }

    assert.equal(
      result.body.export.format,
      "csv"
    );

    assert.match(
      result.body.export.filename,
      /\.csv$/
    );
  }
);
