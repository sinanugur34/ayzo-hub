const BASE32 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const STELLAR_ACCOUNT_VERSION =
  6 << 3;

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

function decodeBase32(
  value: string
): Uint8Array | null {
  let accumulator =
    0;

  let bits =
    0;

  const bytes:
    number[] = [];

  for (
    const character of value
  ) {
    const index =
      BASE32.indexOf(
        character
      );

    if (index < 0) {
      return null;
    }

    accumulator =
      (
        accumulator <<
        5
      ) |
      index;

    bits +=
      5;

    if (
      bits >=
      8
    ) {
      bits -=
        8;

      bytes.push(
        (
          accumulator >>>
          bits
        ) &
        0xff
      );

      accumulator &=
        (
          1 <<
          bits
        ) -
        1;
    }
  }

  if (
    bits !==
    0
  ) {
    return null;
  }

  return new Uint8Array(
    bytes
  );
}

export function isStellarAccountAddress(
  value: string
): boolean {
  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    !/^G[A-Z2-7]{55}$/.test(
      normalized
    )
  ) {
    return false;
  }

  const decoded =
    decodeBase32(
      normalized
    );

  if (
    !decoded ||
    decoded.length !==
      35
  ) {
    return false;
  }

  if (
    decoded[0] !==
      STELLAR_ACCOUNT_VERSION
  ) {
    return false;
  }

  const payload =
    decoded.slice(
      0,
      33
    );

  const checksum =
    crc16Xmodem(
      payload
    );

  /*
   * Stellar StrKey stores the CRC16
   * checksum little-endian.
   */
  const supplied =
    (
      decoded[33] ??
      0
    ) |
    (
      (
        decoded[34] ??
        0
      ) <<
      8
    );

  return checksum ===
    supplied;
}
