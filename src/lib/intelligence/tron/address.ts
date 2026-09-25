import {
  createHash,
} from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(
  value: string
): Uint8Array | null {
  let number =
    0n;

  for (
    const character of
    value
  ) {
    const index =
      BASE58_ALPHABET.indexOf(
        character
      );

    if (index < 0) {
      return null;
    }

    number =
      number *
        58n +
      BigInt(index);
  }

  const decoded:
    number[] = [];

  while (
    number >
    0n
  ) {
    decoded.push(
      Number(
        number &
        255n
      )
    );

    number >>=
      8n;
  }

  decoded.reverse();

  let leadingZeroCount =
    0;

  for (
    const character of
    value
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

function validatedPayload(
  value:
    unknown
): Uint8Array | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
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
    return null;
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
    return null;
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
    return null;
  }

  const firstHash =
    sha256(
      payload
    );

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
      return null;
    }
  }

  return payload;
}

export function tronAddressToHex(
  value:
    unknown
): string | null {
  const payload =
    validatedPayload(
      value
    );

  if (!payload) {
    return null;
  }

  return Array.from(
    payload
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}

export function isTronAddress(
  value:
    unknown
): value is string {
  return (
    tronAddressToHex(
      value
    ) !==
    null
  );
}