const RAW_TON_ADDRESS =
  /^(-1|0):([0-9a-fA-F]{64})$/;

function crc16Xmodem(
  bytes:
    Uint8Array
) {
  let crc =
    0;

  for (
    const byte of
    bytes
  ) {
    crc ^=
      byte <<
      8;

    for (
      let bit = 0;
      bit < 8;
      bit += 1
    ) {
      crc =
        (
          crc &
          0x8000
        ) !==
          0
          ? (
              (
                crc <<
                1
              ) ^
              0x1021
            ) &
            0xffff
          : (
              crc <<
              1
            ) &
            0xffff;
    }
  }

  return crc;
}

function decodeFriendly(
  value:
    string
) {
  const normalized =
    value
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const padding =
    normalized.length %
      4 ===
    0
      ? ""
      : "=".repeat(
          4 -
            (
              normalized.length %
              4
            )
        );

  try {
    return Buffer.from(
      normalized +
        padding,
      "base64"
    );
  } catch {
    return null;
  }
}

export function normalizeTonAddress(
  value:
    string
): string | null {
  const trimmed =
    value.trim();

  const raw =
    RAW_TON_ADDRESS.exec(
      trimmed
    );

  if (raw) {
    return (
      `${raw[1]}:` +
      raw[2].toLowerCase()
    );
  }

  if (
    trimmed.length !==
      48 ||
    !/^[A-Za-z0-9_-]{48}$/.test(
      trimmed
    )
  ) {
    return null;
  }

  const decoded =
    decodeFriendly(
      trimmed
    );

  if (
    !decoded ||
    decoded.length !==
      36
  ) {
    return null;
  }

  const body =
    decoded.subarray(
      0,
      34
    );

  const suppliedCrc =
    (
      decoded[34]! <<
      8
    ) |
    decoded[35]!;

  if (
    crc16Xmodem(
      body
    ) !==
    suppliedCrc
  ) {
    return null;
  }

  const tag =
    decoded[0]!;

  const testOnly =
    (
      tag &
      0x80
    ) !==
    0;

  const baseTag =
    tag &
    0x7f;

  if (
    testOnly ||
    (
      baseTag !==
        0x11 &&
      baseTag !==
        0x51
    )
  ) {
    return null;
  }

  const workchainByte =
    decoded[1]!;

  const workchain =
    workchainByte ===
      0xff
      ? -1
      : workchainByte ===
          0x00
        ? 0
        : null;

  if (
    workchain ===
    null
  ) {
    return null;
  }

  return (
    `${workchain}:` +
    decoded
      .subarray(
        2,
        34
      )
      .toString(
        "hex"
      )
  );
}

export function isTonAddress(
  value:
    string
): boolean {
  return (
    normalizeTonAddress(
      value
    ) !== null
  );
}
