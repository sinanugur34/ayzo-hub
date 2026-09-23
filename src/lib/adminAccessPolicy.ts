const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAdminUserIds(
  raw:
    string |
    null |
    undefined
) {
  return new Set(
    (
      raw ??
      ""
    )
      .split(",")
      .map(
        value =>
          value
            .trim()
            .toLowerCase()
      )
      .filter(
        value =>
          UUID_PATTERN.test(
            value
          )
      )
  );
}

export function isConfiguredAdminUserId(
  userId:
    string |
    null |
    undefined,
  rawAdminUserIds:
    string |
    null |
    undefined
) {
  if (
    !userId ||
    !UUID_PATTERN.test(
      userId
    )
  ) {
    return false;
  }

  return parseAdminUserIds(
    rawAdminUserIds
  ).has(
    userId.toLowerCase()
  );
}
