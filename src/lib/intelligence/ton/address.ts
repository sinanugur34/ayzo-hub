const RAW_TON_ADDRESS =
  /^(?:0|-1):[0-9a-fA-F]{64}$/;

function crc16Xmodem(
  bytes: Uint8Array
): number {
  let crc =
    0;

  for (const byte of bytes) {
    crc ^=
      byte << 8;

    for (
      let bit = 0;
      bit < 8;
      bit += 1
    ) {
      crc =
        (
          crc &
          0x8000
        ) !== 0
          ? (
              (
                crc << 1
              ) ^
              0x1021
            ) &
            0xffff
          : (
              crc << 1
            ) &
            0xffff;
    }
  }

  return crc;
}

function decodeFriendly(
  value: string
): Uint8Array | null {
  if (
    value.length !==
    48
  ) {
    return null;
  }

  if (
    !/^[A-Za-z0-9_-]{48}$/.test(
      value
    )
  ) {
    return null;
  }

  try {
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

    const buffer =
      Buffer.from(
        normalized,
        "base64"
      );

    return buffer.length ===
      36
      ? new Uint8Array(
          buffer
        )
      : null;
  } catch {
    return null;
  }
}

export function isTonAddress(
  value: string
): boolean {
  const normalized =
    value.trim();

  if (
    RAW_TON_ADDRESS.test(
      normalized
    )
  ) {
    return true;
  }

  const decoded =
    decodeFriendly(
      normalized
    );

  if (!decoded) {
    return false;
  }

  const tag =
    decoded[0];

  if (
    tag !== 0x11 &&
    tag !== 0x51 &&
    tag !== 0x91 &&
    tag !== 0xd1
  ) {
    return false;
  }

  const workchain =
    decoded[1];

  if (
    workchain !== 0x00 &&
    workchain !== 0xff
  ) {
    return false;
  }

  const payload =
    decoded.slice(
      0,
      34
    );

  const expected =
    crc16Xmodem(
      payload
    );

  const supplied =
    (
      (
        decoded[34] ??
        0
      ) <<
      8
    ) |
    (
      decoded[35] ??
      0
    );

  return expected ===
    supplied;
}
