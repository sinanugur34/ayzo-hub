import {
  createHash,
} from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(
  value: string
): Uint8Array | null {
  let number =
    BigInt(0);

  for (const character of value) {
    const index =
      BASE58_ALPHABET.indexOf(
        character
      );

    if (index < 0) {
      return null;
    }

    number =
      number *
        BigInt(58) +
      BigInt(index);
  }

  const decoded:
    number[] = [];

  while (
    number >
    BigInt(0)
  ) {
    decoded.push(
      Number(
        number &
          BigInt(255)
      )
    );

    number >>=
      BigInt(8);
  }

  decoded.reverse();

  let leadingZeroCount =
    0;

  for (
    const character
    of value
  ) {
    if (
      character !== "1"
    ) {
      break;
    }

    leadingZeroCount +=
      1;
  }

  return Uint8Array.from([
    ...new Array(
      leadingZeroCount
    ).fill(0),
    ...decoded,
  ]);
}

function sha256(
  value: Uint8Array
): Uint8Array {
  return createHash(
    "sha256"
  )
    .update(value)
    .digest();
}

export function isTronAddress(
  value: unknown
): value is string {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  const address =
    value.trim();

  if (
    address.length !==
      34 ||
    !address.startsWith(
      "T"
    )
  ) {
    return false;
  }

  const decoded =
    decodeBase58(
      address
    );

  if (
    !decoded ||
    decoded.length !==
      25
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

  if (
    payload[0] !==
    0x41
  ) {
    return false;
  }

  const firstHash =
    sha256(payload);

  const secondHash =
    sha256(
      firstHash
    );

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    if (
      checksum[index] !==
      secondHash[index]
    ) {
      return false;
    }
  }

  return true;
}
