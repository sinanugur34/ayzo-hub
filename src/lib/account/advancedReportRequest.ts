import {
  buildAdvancedReport,
} from "./advancedReport";

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

export type AdvancedReportRequestResult =
  | {
      status: 200;
      body: {
        ok: true;
        report:
          ReturnType<
            typeof buildAdvancedReport
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

export function handleAdvancedReportRequest({
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
}): AdvancedReportRequestResult {
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
      "advancedReports"
    )
  ) {
    return {
      status:
        403,

      body: {
        error:
          "Advanced Reports requires AYZO Pro or Advanced.",

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

  const snapshot =
    parseHistoricalSnapshot(
      body.currentSnapshot
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue ||
    !title ||
    !snapshot
  ) {
    return {
      status:
        400,

      body: {
        error:
          "Invalid advanced report fields.",
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

  return {
    status:
      200,

    body: {
      ok:
        true,

      report:
        buildAdvancedReport({
          title,
          subjectType,
          subjectValue,
          snapshot,
          generatedAt,
        }),
    },
  };
}
