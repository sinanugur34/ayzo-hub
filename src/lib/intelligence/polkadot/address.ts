import {
  createHash,
} from "node:crypto";

const ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const MAP =
  new Map(
    Array.from(
      ALPHABET,
      (
        char,
        index
      ) => [
        char,
        index,
      ] as const
    )
  );

const SS58_PREFIX =
  Buffer.from(
    "SS58PRE",
    "ascii"
  );

function decodeBase58(
  value:
    string
): Uint8Array | null {
  if (!value) {
    return null;
  }

  const bytes:
    number[] = [
      0,
    ];

  for (
    const char of
    value
  ) {
    const digit =
      MAP.get(
        char
      );

    if (
      digit ===
        undefined
    ) {
      return null;
    }

    let carry =
      digit;

    for (
      let index = 0;
      index <
        bytes.length;
      index += 1
    ) {
      const current =
        bytes[index] *
          58 +
        carry;

      bytes[index] =
        current &
        0xff;

      carry =
        current >>
        8;
    }

    while (
      carry > 0
    ) {
      bytes.push(
        carry &
          0xff
      );

      carry >>=
        8;
    }
  }

  for (
    let index = 0;
    index <
      value.length -
        1 &&
    value[index] ===
      "1";
    index += 1
  ) {
    bytes.push(
      0
    );
  }

  return Uint8Array.from(
    bytes.reverse()
  );
}

function checksum(
  payload:
    Uint8Array
) {
  return createHash(
    "blake2b512"
  )
    .update(
      SS58_PREFIX
    )
    .update(
      payload
    )
    .digest();
}

export function normalizePolkadotAddress(
  value:
    string
): string | null {
  const normalized =
    value.trim();

  if (
    normalized.length <
      47 ||
    normalized.length >
      48
  ) {
    return null;
  }

  const decoded =
    decodeBase58(
      normalized
    );

  /*
   * Polkadot AccountId32:
   *
   * 1 byte network prefix = 0
   * 32 bytes public account id
   * 2 bytes SS58 checksum
   */
  if (
    !decoded ||
    decoded.length !==
      35 ||
    decoded[0] !==
      0
  ) {
    return null;
  }

  const payload =
    decoded.slice(
      0,
      33
    );

  const expected =
    checksum(
      payload
    );

  if (
    decoded[33] !==
      expected[0] ||
    decoded[34] !==
      expected[1]
  ) {
    return null;
  }

  return normalized;
}
