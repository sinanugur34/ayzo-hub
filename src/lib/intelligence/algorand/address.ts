import {
  createHash,
} from "node:crypto";

const BASE32_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const ADDRESS_LENGTH =
  58;

const PUBLIC_KEY_BYTES =
  32;

const CHECKSUM_BYTES =
  4;

function equalBytes(
  left: Uint8Array,
  right: Uint8Array
): boolean {
  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    if (
      left[index] !==
      right[index]
    ) {
      return false;
    }
  }

  return true;
}

function decodeBase32(
  value: string
): Uint8Array | null {
  let accumulator =
    0;

  let bitCount =
    0;

  const bytes:
    number[] = [];

  for (
    const character of value
  ) {
    const digit =
      BASE32_ALPHABET.indexOf(
        character
      );

    if (digit < 0) {
      return null;
    }

    accumulator =
      (
        accumulator << 5
      ) |
      digit;

    bitCount +=
      5;

    while (
      bitCount >= 8
    ) {
      bitCount -=
        8;

      bytes.push(
        (
          accumulator >>
          bitCount
        ) &
        0xff
      );

      accumulator &=
        (1 << bitCount) - 1;
    }
  }

  if (
    bitCount > 0 &&
    accumulator !== 0
  ) {
    return null;
  }

  return new Uint8Array(
    bytes
  );
}

function checksum(
  publicKey:
    Uint8Array
): Uint8Array {
  const digest =
    createHash(
      "sha512-256"
    )
      .update(
        publicKey
      )
      .digest();

  return digest.slice(
    digest.length -
      CHECKSUM_BYTES
  );
}

export function normalizeAlgorandAddress(
  input: string
): string | null {
  const value =
    input
      .trim()
      .toUpperCase();

  if (
    value.length !==
      ADDRESS_LENGTH
  ) {
    return null;
  }

  const decoded =
    decodeBase32(
      value
    );

  if (
    !decoded ||
    decoded.length !==
      PUBLIC_KEY_BYTES +
        CHECKSUM_BYTES
  ) {
    return null;
  }

  const publicKey =
    decoded.slice(
      0,
      PUBLIC_KEY_BYTES
    );

  const suppliedChecksum =
    decoded.slice(
      PUBLIC_KEY_BYTES
    );

  const expectedChecksum =
    checksum(
      publicKey
    );

  if (
    !equalBytes(
      suppliedChecksum,
      expectedChecksum
    )
  ) {
    return null;
  }

  return value;
}
