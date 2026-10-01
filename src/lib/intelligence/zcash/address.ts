import {
  createHash,
} from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const TRANSPARENT_DECODED_LENGTH =
  26;

const TRANSPARENT_PAYLOAD_LENGTH =
  22;

const ZCASH_MAINNET_P2PKH =
  [
    0x1c,
    0xb8,
  ] as const;

const ZCASH_MAINNET_P2SH =
  [
    0x1c,
    0xbd,
  ] as const;

export type ZcashAddressKind =
  | "transparent-p2pkh"
  | "transparent-p2sh"
  | "shielded-sapling"
  | "unified";

function sha256(
  value:
    Uint8Array
): Uint8Array {
  return createHash(
    "sha256"
  )
    .update(
      value
    )
    .digest();
}

function equalBytes(
  left:
    Uint8Array,
  right:
    Uint8Array
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

function decodeBase58(
  value:
    string
): Uint8Array | null {
  if (!value) {
    return null;
  }

  let numericValue =
    0n;

  for (
    const character
    of value
  ) {
    const digit =
      BASE58_ALPHABET
        .indexOf(
          character
        );

    if (digit < 0) {
      return null;
    }

    numericValue =
      numericValue *
        58n +
      BigInt(
        digit
      );
  }

  const decoded:
    number[] = [];

  while (
    numericValue > 0n
  ) {
    decoded.push(
      Number(
        numericValue &
          0xffn
      )
    );

    numericValue >>=
      8n;
  }

  decoded.reverse();

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
    ).fill(
      0
    ),
    ...decoded,
  ]);
}

function transparentKind(
  value:
    string
):
  | "transparent-p2pkh"
  | "transparent-p2sh"
  | null {
  const decoded =
    decodeBase58(
      value
    );

  if (
    !decoded ||
    decoded.length !==
      TRANSPARENT_DECODED_LENGTH
  ) {
    return null;
  }

  const payload =
    decoded.slice(
      0,
      TRANSPARENT_PAYLOAD_LENGTH
    );

  const suppliedChecksum =
    decoded.slice(
      TRANSPARENT_PAYLOAD_LENGTH
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

  if (
    !equalBytes(
      suppliedChecksum,
      expectedChecksum
    )
  ) {
    return null;
  }

  if (
    decoded[0] ===
      ZCASH_MAINNET_P2PKH[0] &&
    decoded[1] ===
      ZCASH_MAINNET_P2PKH[1]
  ) {
    return "transparent-p2pkh";
  }

  if (
    decoded[0] ===
      ZCASH_MAINNET_P2SH[0] &&
    decoded[1] ===
      ZCASH_MAINNET_P2SH[1]
  ) {
    return "transparent-p2sh";
  }

  return null;
}

export function getZcashAddressKind(
  input:
    string
): ZcashAddressKind | null {
  const value =
    input.trim();

  const transparent =
    transparentKind(
      value
    );

  if (transparent) {
    return transparent;
  }

  /*
   * AYZO intentionally does not claim
   * shielded receiver validity here.
   *
   * These branches only classify an
   * address-like privacy family so the
   * engine can refuse public tracing
   * instead of inventing evidence.
   */
  const normalized =
    value.toLowerCase();

  if (
    normalized.startsWith(
      "zs1"
    ) &&
    normalized.length > 20
  ) {
    return "shielded-sapling";
  }

  if (
    normalized.startsWith(
      "u1"
    ) &&
    normalized.length > 20
  ) {
    return "unified";
  }

  return null;
}

export function normalizeZcashTransparentAddress(
  input:
    string
): string | null {
  const value =
    input.trim();

  const kind =
    transparentKind(
      value
    );

  return kind
    ? value
    : null;
}

export function isZcashShieldedOrUnifiedAddress(
  input:
    string
): boolean {
  const value =
    input
      .trim()
      .toLowerCase();

  return (
    (
      value.startsWith(
        "zs1"
      ) &&
      value.length > 20
    ) ||
    (
      value.startsWith(
        "u1"
      ) &&
      value.length > 20
    )
  );
}
