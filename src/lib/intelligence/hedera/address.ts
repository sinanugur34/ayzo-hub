const MAX_UINT64 =
  18_446_744_073_709_551_615n;

const ACCOUNT_ID =
  /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;

function parseSegment(
  value:
    string
): bigint | null {
  try {
    const parsed =
      BigInt(
        value
      );

    return (
      parsed >= 0n &&
      parsed <=
        MAX_UINT64
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function normalizeHederaAccountId(
  value:
    string
): string | null {
  const trimmed =
    value.trim();

  const match =
    ACCOUNT_ID.exec(
      trimmed
    );

  if (!match) {
    return null;
  }

  const shard =
    parseSegment(
      match[1]!
    );

  const realm =
    parseSegment(
      match[2]!
    );

  const num =
    parseSegment(
      match[3]!
    );

  if (
    shard === null ||
    realm === null ||
    num === null
  ) {
    return null;
  }

  return (
    `${shard}.${realm}.${num}`
  );
}

export function isHederaAccountId(
  value:
    string
) {
  return (
    normalizeHederaAccountId(
      value
    ) !== null
  );
}
