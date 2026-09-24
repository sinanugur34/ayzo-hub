import {
  createHash,
} from "node:crypto";

const XRPL_BASE58_ALPHABET =
  "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

function sha256(
  value: Uint8Array
) {
  return createHash(
    "sha256"
  )
    .update(value)
    .digest();
}

function decodeBase58(
  value: string
): Uint8Array | null {
  let number =
    0n;

  for (
    const character
    of value
  ) {
    const index =
      XRPL_BASE58_ALPHABET.indexOf(
        character
      );

    if (
      index < 0
    ) {
      return null;
    }

    number =
      number * 58n +
      BigInt(index);
  }

  const bytes:
    number[] = [];

  while (
    number > 0n
  ) {
    bytes.unshift(
      Number(
        number % 256n
      )
    );

    number /=
      256n;
  }

  let leadingZeroes =
    0;

  while (
    value[leadingZeroes] ===
      XRPL_BASE58_ALPHABET[0]
  ) {
    leadingZeroes +=
      1;
  }

  return Uint8Array.from([
    ...new Array(
      leadingZeroes
    ).fill(0),
    ...bytes,
  ]);
}

export function isXrplClassicAddress(
  value: string
) {
  const address =
    value.trim();

  if (
    address.length < 25 ||
    address.length > 35 ||
    !address.startsWith("r")
  ) {
    return false;
  }

  const decoded =
    decodeBase58(
      address
    );

  /*
   * XRPL classic account:
   * 1-byte prefix +
   * 20-byte account id +
   * 4-byte checksum.
   */
  if (
    !decoded ||
    decoded.length !== 25 ||
    decoded[0] !== 0
  ) {
    return false;
  }

  const payload =
    decoded.slice(
      0,
      21
    );

  const checksum =
    decoded.slice(
      21
    );

  const expected =
    sha256(
      sha256(
        payload
      )
    ).subarray(
      0,
      4
    );

  return checksum.every(
    (
      byte,
      index
    ) =>
      byte ===
      expected[index]
  );
}