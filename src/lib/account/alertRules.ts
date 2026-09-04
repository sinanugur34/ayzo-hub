export const basicAlertRuleTypes = [
  "new_activity",
  "funding_movement",
  "relationship_change",
  "contract_activity",
] as const;

export type BasicAlertRuleType =
  (typeof basicAlertRuleTypes)[number];

export const alertSubjectTypes = [
  "wallet",
  "token",
  "transaction",
  "entity",
  "protocol",
] as const;

export type AlertSubjectType =
  (typeof alertSubjectTypes)[number];

export type CreateAlertRuleInput = {
  watchlistId:
    string | null;

  network:
    string | null;

  subjectType:
    AlertSubjectType | null;

  subjectValue:
    string | null;

  ruleType:
    BasicAlertRuleType;

  enabled:
    boolean;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredString(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    !trimmed ||
    trimmed.length >
      maxLength
  ) {
    return null;
  }

  return trimmed;
}

function optionalString(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    requiredString(
      value,
      maxLength
    );

  return parsed ??
    undefined;
}

export function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function parseCreateAlertRule(
  value: unknown
): CreateAlertRuleInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawWatchlistId =
    optionalString(
      value.watchlistId,
      64
    );

  if (
    rawWatchlistId ===
    undefined
  ) {
    return null;
  }

  const watchlistId =
    rawWatchlistId;

  if (
    watchlistId !==
      null &&
    !isUuid(
      watchlistId
    )
  ) {
    return null;
  }

  const rawNetwork =
    optionalString(
      value.network,
      64
    );

  if (
    rawNetwork ===
    undefined
  ) {
    return null;
  }

  const network =
    rawNetwork;

  let subjectType:
    AlertSubjectType | null =
      null;

  if (
    value.subjectType !==
      undefined &&
    value.subjectType !==
      null &&
    value.subjectType !==
      ""
  ) {
    if (
      typeof value.subjectType !==
        "string" ||
      !alertSubjectTypes.includes(
        value.subjectType as
          AlertSubjectType
      )
    ) {
      return null;
    }

    subjectType =
      value.subjectType as
        AlertSubjectType;
  }

  const rawSubjectValue =
    optionalString(
      value.subjectValue,
      512
    );

  if (
    rawSubjectValue ===
    undefined
  ) {
    return null;
  }

  const subjectValue =
    rawSubjectValue;

  if (
    (
      subjectType ===
        null
    ) !==
    (
      subjectValue ===
        null
    )
  ) {
    return null;
  }

  /*
   * A direct subject rule must identify
   * the blockchain/network explicitly.
   */
  if (
    subjectType !==
      null &&
    network ===
      null
  ) {
    return null;
  }

  /*
   * Foundation v1 requires either:
   * - a watchlist target
   * - a direct subject target
   *
   * Global account-wide rules are not
   * enabled yet.
   */
  if (
    watchlistId ===
      null &&
    subjectType ===
      null
  ) {
    return null;
  }

  if (
    typeof value.ruleType !==
      "string" ||
    !basicAlertRuleTypes.includes(
      value.ruleType as
        BasicAlertRuleType
    )
  ) {
    return null;
  }

  let enabled =
    true;

  if (
    value.enabled !==
    undefined
  ) {
    if (
      typeof value.enabled !==
      "boolean"
    ) {
      return null;
    }

    enabled =
      value.enabled;
  }

  return {
    watchlistId,
    network,
    subjectType,
    subjectValue,

    ruleType:
      value.ruleType as
        BasicAlertRuleType,

    enabled,
  };
}

export function parseAlertRuleToggle(
  value: unknown
) {
  if (
    !isRecord(value) ||
    typeof value.enabled !==
      "boolean"
  ) {
    return null;
  }

  return {
    enabled:
      value.enabled,
  };
}
