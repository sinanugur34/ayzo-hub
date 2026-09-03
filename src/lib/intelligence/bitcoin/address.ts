import {
  createHash,
} from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const BECH32_CHARSET =
  "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

const BECH32_CONST =
  1;

const BECH32M_CONST =
  0x2bc830a3;

function sha256(
  data: Uint8Array
): Uint8Array {
  return createHash("sha256")
    .update(data)
    .digest();
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
      numericValue * 58n +
      BigInt(digit);
  }

  const decoded:
    number[] = [];

  while (numericValue > 0n) {
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
    leadingZeroes += 1;
  }

  return new Uint8Array([
    ...new Array<number>(
      leadingZeroes
    ).fill(0),
    ...decoded,
  ]);
}

function isBase58MainnetAddress(
  value: string
): boolean {
  const decoded =
    decodeBase58(value);

  if (
    !decoded ||
    decoded.length !== 25
  ) {
    return false;
  }

  const version =
    decoded[0];

  if (
    version !== 0x00 &&
    version !== 0x05
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

  const firstHash =
    sha256(payload);

  const secondHash =
    sha256(firstHash);

  const expectedChecksum =
    secondHash.slice(
      0,
      4
    );

  return equalBytes(
    suppliedChecksum,
    expectedChecksum
  );
}

function bech32Polymod(
  values: readonly number[]
): number {
  const generators = [
    0x3b6a57b2,
    0x26508e6d,
    0x1ea119fa,
    0x3d4233dd,
    0x2a1462b3,
  ];

  let checksum =
    1;

  for (const value of values) {
    const top =
      checksum >>> 25;

    checksum =
      (
        (
          checksum &
          0x1ffffff
        ) <<
        5
      ) ^
      value;

    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      if (
        (
          (
            top >>>
            index
          ) &
          1
        ) !== 0
      ) {
        checksum ^=
          generators[index] ??
          0;
      }
    }
  }

  return checksum >>>
    0;
}

function expandHrp(
  value: string
): number[] {
  const result:
    number[] = [];

  for (const character of value) {
    result.push(
      character.charCodeAt(0) >>>
        5
    );
  }

  result.push(0);

  for (const character of value) {
    result.push(
      character.charCodeAt(0) &
        31
    );
  }

  return result;
}

function convertBits(
  values: readonly number[],
  fromBits: number,
  toBits: number
): number[] | null {
  let accumulator =
    0;

  let bitCount =
    0;

  const output:
    number[] = [];

  const maxValue =
    (1 << toBits) - 1;

  const maxAccumulator =
    (
      1 <<
      (
        fromBits +
        toBits -
        1
      )
    ) -
    1;

  for (const value of values) {
    if (
      value < 0 ||
      (
        value >>>
        fromBits
      ) !== 0
    ) {
      return null;
    }

    accumulator =
      (
        (
          accumulator <<
          fromBits
        ) |
        value
      ) &
      maxAccumulator;

    bitCount +=
      fromBits;

    while (
      bitCount >=
      toBits
    ) {
      bitCount -=
        toBits;

      output.push(
        (
          accumulator >>>
          bitCount
        ) &
        maxValue
      );
    }
  }

  if (
    bitCount >=
    fromBits
  ) {
    return null;
  }

  if (
    (
      (
        accumulator <<
        (
          toBits -
          bitCount
        )
      ) &
      maxValue
    ) !== 0
  ) {
    return null;
  }

  return output;
}

function isSegwitMainnetAddress(
  value: string
): boolean {
  if (
    value.length < 8 ||
    value.length > 90
  ) {
    return false;
  }

  for (const character of value) {
    const code =
      character.charCodeAt(
        0
      );

    if (
      code < 33 ||
      code > 126
    ) {
      return false;
    }
  }

  const hasLowercase =
    value !==
    value.toUpperCase();

  const hasUppercase =
    value !==
    value.toLowerCase();

  if (
    hasLowercase &&
    hasUppercase
  ) {
    return false;
  }

  const normalized =
    value.toLowerCase();

  const separatorIndex =
    normalized.lastIndexOf(
      "1"
    );

  if (
    separatorIndex <= 0 ||
    separatorIndex + 7 >
      normalized.length
  ) {
    return false;
  }

  const hrp =
    normalized.slice(
      0,
      separatorIndex
    );

  if (hrp !== "bc") {
    return false;
  }

  const encodedData =
    normalized.slice(
      separatorIndex + 1
    );

  const data:
    number[] = [];

  for (
    const character of encodedData
  ) {
    const decoded =
      BECH32_CHARSET.indexOf(
        character
      );

    if (decoded < 0) {
      return false;
    }

    data.push(decoded);
  }

  if (data.length < 7) {
    return false;
  }

  const polymod =
    bech32Polymod([
      ...expandHrp(hrp),
      ...data,
    ]);

  const isBech32 =
    polymod ===
    BECH32_CONST;

  const isBech32m =
    polymod ===
    BECH32M_CONST;

  if (
    !isBech32 &&
    !isBech32m
  ) {
    return false;
  }

  const payload =
    data.slice(
      0,
      -6
    );

  const witnessVersion =
    payload[0];

  if (
    witnessVersion ===
      undefined ||
    witnessVersion > 16
  ) {
    return false;
  }

  const witnessProgram =
    convertBits(
      payload.slice(1),
      5,
      8
    );

  if (
    !witnessProgram ||
    witnessProgram.length < 2 ||
    witnessProgram.length > 40
  ) {
    return false;
  }

  if (
    witnessVersion === 0
  ) {
    if (
      witnessProgram.length !== 20 &&
      witnessProgram.length !== 32
    ) {
      return false;
    }

    return isBech32;
  }

  return isBech32m;
}

export function isBitcoinMainnetAddress(
  value: string
): boolean {
  const address =
    value.trim();

  if (!address) {
    return false;
  }

  if (
    address.startsWith(
      "1"
    ) ||
    address.startsWith(
      "3"
    )
  ) {
    return isBase58MainnetAddress(
      address
    );
  }

  if (
    address
      .toLowerCase()
      .startsWith(
        "bc1"
      )
  ) {
    return isSegwitMainnetAddress(
      address
    );
  }

  return false;
}
