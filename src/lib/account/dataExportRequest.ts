import {
  buildAdvancedReport,
} from "./advancedReport";

import {
  buildDataExport,
} from "./dataExport";

import type {
  DataExportFormat,
} from "./dataExport";

import {
  parseHistoricalSnapshot,
} from "./historicalChanges";

import {
  isRecord,
  readRequiredString,
  readSubjectType,
} from "./validation";

import {
  planHasFeature,
} from "../plans/registry";

import type {
  PlanId,
} from "../plans/types";

export type DataExportRequestResult =
  | {
      status: 200;

      body: {
        ok: true;

        export:
          ReturnType<
            typeof buildDataExport
          >;
      };
    }
  | {
      status:
        | 400
        | 401
        | 403;

      body: {
        error: string;

        code?:
          "PLAN_REQUIRED";
      };
    };

function readFormat(
  value:
    unknown
): DataExportFormat | null {
  return (
    value ===
      "json" ||
    value ===
      "csv"
  )
    ? value
    : null;
}

export function handleDataExportRequest({
  authenticated,
  planId,
  body,
  generatedAt,
}: {
  authenticated:
    boolean;

  planId:
    PlanId;

  body:
    unknown;

  generatedAt?:
    string;
}): DataExportRequestResult {
  if (!authenticated) {
    return {
      status:
        401,

      body: {
        error:
          "Unauthorized",
      },
    };
  }

  if (
    !planHasFeature(
      planId,
      "dataExport"
    )
  ) {
    return {
      status:
        403,

      body: {
        error:
          "Data Export requires AYZO Pro or Advanced.",

        code:
          "PLAN_REQUIRED",
      },
    };
  }

  if (
    !isRecord(
      body
    )
  ) {
    return {
      status:
        400,

      body: {
        error:
          "Invalid request.",
      },
    };
  }

  const network =
    readRequiredString(
      body.network,
      64
    );

  const subjectType =
    readSubjectType(
      body.subjectType
    );

  const subjectValue =
    readRequiredString(
      body.subjectValue,
      512
    );

  const title =
    readRequiredString(
      body.title,
      256
    );

  const format =
    readFormat(
      body.format
    );

  const snapshot =
    parseHistoricalSnapshot(
      body.currentSnapshot
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue ||
    !title ||
    !format ||
    !snapshot
  ) {
    return {
      status:
        400,

      body: {
        error:
          "Invalid data export fields.",
      },
    };
  }

  if (
    snapshot.network !==
    network
  ) {
    return {
      status:
        400,

      body: {
        error:
          "Snapshot network does not match request network.",
      },
    };
  }

  const report =
    buildAdvancedReport({
      title,
      subjectType,
      subjectValue,
      snapshot,
      generatedAt,
    });

  return {
    status:
      200,

    body: {
      ok:
        true,

      export:
        buildDataExport(
          report,
          format
        ),
    },
  };
}
