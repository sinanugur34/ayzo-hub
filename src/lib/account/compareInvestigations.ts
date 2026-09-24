import {
  isRecord,
} from "@/lib/account/validation";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InvestigationSnapshot = {
  id: string;
  network: string;
  subjectType: string;
  subjectValue: string;
  title: string | null;
  createdAt: string;
  analysisPayload: unknown;
};

export function isCompareUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    uuidPattern.test(value)
  );
}

export function parseCompareInvestigationsInput(
  value: unknown
) {
  if (!isRecord(value)) {
    return null;
  }

  const leftSavedAnalysisId =
    value.leftSavedAnalysisId;

  const rightSavedAnalysisId =
    value.rightSavedAnalysisId;

  if (
    !isCompareUuid(
      leftSavedAnalysisId
    ) ||
    !isCompareUuid(
      rightSavedAnalysisId
    ) ||
    leftSavedAnalysisId ===
      rightSavedAnalysisId
  ) {
    return null;
  }

  return {
    leftSavedAnalysisId,
    rightSavedAnalysisId,
  };
}

function stableStringify(
  value: unknown
): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return (
      JSON.stringify(value) ??
      "null"
    );
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableStringify)
      .join(",")}]`;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return `{${Object
    .keys(record)
    .sort()
    .map(
      key =>
        `${JSON.stringify(
          key
        )}:${stableStringify(
          record[key]
        )}`
    )
    .join(",")}}`;
}

function topLevelRecord(
  value: unknown
) {
  return isRecord(value)
    ? value
    : {};
}

export function buildInvestigationComparison(
  left: InvestigationSnapshot,
  right: InvestigationSnapshot
) {
  const leftRecord =
    topLevelRecord(
      left.analysisPayload
    );

  const rightRecord =
    topLevelRecord(
      right.analysisPayload
    );

  const leftKeys =
    Object.keys(
      leftRecord
    ).sort();

  const rightKeys =
    Object.keys(
      rightRecord
    ).sort();

  const rightSet =
    new Set(
      rightKeys
    );

  const leftSet =
    new Set(
      leftKeys
    );

  const sharedKeys =
    leftKeys.filter(
      key =>
        rightSet.has(key)
    );

  const leftOnlyKeys =
    leftKeys.filter(
      key =>
        !rightSet.has(key)
    );

  const rightOnlyKeys =
    rightKeys.filter(
      key =>
        !leftSet.has(key)
    );

  const changedKeys =
    sharedKeys.filter(
      key =>
        stableStringify(
          leftRecord[key]
        ) !==
        stableStringify(
          rightRecord[key]
        )
    );

  const changedSet =
    new Set(
      changedKeys
    );

  const unchangedKeys =
    sharedKeys.filter(
      key =>
        !changedSet.has(key)
    );

  return {
    version: 1,

    subjects: {
      sameNetwork:
        left.network ===
        right.network,

      sameSubjectType:
        left.subjectType ===
        right.subjectType,

      sameSubjectValue:
        left.subjectValue ===
        right.subjectValue,
    },

    payload: {
      exactMatch:
        stableStringify(
          left.analysisPayload
        ) ===
        stableStringify(
          right.analysisPayload
        ),

      leftKeyCount:
        leftKeys.length,

      rightKeyCount:
        rightKeys.length,

      sharedKeyCount:
        sharedKeys.length,

      changedKeyCount:
        changedKeys.length,

      unchangedKeyCount:
        unchangedKeys.length,

      sharedKeys,
      changedKeys,
      unchangedKeys,
      leftOnlyKeys,
      rightOnlyKeys,
    },

    left: {
      id:
        left.id,
      title:
        left.title,
      network:
        left.network,
      subjectType:
        left.subjectType,
      subjectValue:
        left.subjectValue,
      createdAt:
        left.createdAt,
    },

    right: {
      id:
        right.id,
      title:
        right.title,
      network:
        right.network,
      subjectType:
        right.subjectType,
      subjectValue:
        right.subjectValue,
      createdAt:
        right.createdAt,
    },
  };
}
