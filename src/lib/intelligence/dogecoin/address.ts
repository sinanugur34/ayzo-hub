import {
  createHash,
} from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/*
 * Dogecoin mainnet:
 * P2PKH = 0x1e
 * P2SH  = 0x16
 */
const DOGECOIN_MAINNET_VERSIONS =
  new Set([
    0x1e,
    0x16,
  ]);

function sha256(
  data: Uint8Array
): Uint8Array {
  return createHash(
    "sha256"
  )
    .update(data)
    .digest();
}

function decodeBase58(
  value: string
): Uint8Array | null {
  if (!value) {
    return null;
  }

  let numericValue =
    0n;

  for (const character of value) {
    const digit =
      BASE58_ALPHABET.indexOf(
        character
      );

    if (digit < 0) {
      return null;
    }

    numericValue =
      numericValue *
        58n +
      BigInt(digit);
  }

  const bytes:
    number[] = [];

  while (
    numericValue > 0n
  ) {
    bytes.push(
      Number(
        numericValue &
          0xffn
      )
    );

    numericValue >>=
      8n;
  }

  bytes.reverse();

  let leadingZeroes =
    0;

  while (
    leadingZeroes <
      value.length &&
    value[
      leadingZeroes
    ] === "1"
  ) {
    leadingZeroes +=
      1;
  }

  return new Uint8Array([
    ...new Array<number>(
      leadingZeroes
    ).fill(0),
    ...bytes,
  ]);
}

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
    index <
      left.length;
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

export function isDogecoinMainnetAddress(
  value: string
): boolean {
  const normalized =
    value.trim();

  const decoded =
    decodeBase58(
      normalized
    );

  if (
    !decoded ||
    decoded.length !==
      25
  ) {
    return false;
  }

  const version =
    decoded[0];

  if (
    version ===
      undefined ||
    !DOGECOIN_MAINNET_VERSIONS
      .has(version)
  ) {
    return false;
  }

  const payload =
    decoded.slice(
      0,
      21
    );

  const suppliedChecksum =
    decoded.slice(
      21
    );

  const expectedChecksum =
    sha256(
      sha256(
        payload
      )
    ).slice(
      0,
      4
    );

  return equalBytes(
    suppliedChecksum,
    expectedChecksum
  );
}
