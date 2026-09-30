const BECH32_CHARSET =
  "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function polymod(
  values: readonly number[]
) {
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
          top >>>
          index
        ) &
        1
      ) {
        checksum ^=
          generators[index] ??
          0;
      }
    }
  }

  return checksum >>> 0;
}

function expandHrp(
  hrp: string
) {
  const values:
    number[] = [];

  for (const character of hrp) {
    values.push(
      character
        .charCodeAt(0) >>>
        5
    );
  }

  values.push(0);

  for (const character of hrp) {
    values.push(
      character
        .charCodeAt(0) &
        31
    );
  }

  return values;
}

function convertBits(
  values:
    readonly number[],
  fromBits:
    number,
  toBits:
    number
): number[] | null {
  let accumulator =
    0;

  let bitCount =
    0;

  const result:
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

      result.push(
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

  return result;
}

type DecodedCardanoAddress = {
  hrp:
    "addr" |
    "stake";

  bytes:
    Uint8Array;

  addressType:
    number;

  networkId:
    number;
};

export function decodeCardanoMainnetAddress(
  value:
    string
): DecodedCardanoAddress | null {
  const trimmed =
    value.trim();

  if (
    trimmed.length < 15 ||
    trimmed.length > 200
  ) {
    return null;
  }

  if (
    trimmed !==
      trimmed.toLowerCase() &&
    trimmed !==
      trimmed.toUpperCase()
  ) {
    return null;
  }

  const normalized =
    trimmed.toLowerCase();

  const separator =
    normalized.lastIndexOf(
      "1"
    );

  if (
    separator <= 0 ||
    separator +
      7 >
      normalized.length
  ) {
    return null;
  }

  const hrp =
    normalized.slice(
      0,
      separator
    );

  if (
    hrp !== "addr" &&
    hrp !== "stake"
  ) {
    return null;
  }

  const encoded =
    normalized.slice(
      separator + 1
    );

  const words:
    number[] = [];

  for (const character of encoded) {
    const index =
      BECH32_CHARSET.indexOf(
        character
      );

    if (index < 0) {
      return null;
    }

    words.push(
      index
    );
  }

  if (
    polymod([
      ...expandHrp(
        hrp
      ),
      ...words,
    ]) !==
      1
  ) {
    return null;
  }

  const payloadWords =
    words.slice(
      0,
      -6
    );

  const decoded =
    convertBits(
      payloadWords,
      5,
      8
    );

  if (
    !decoded ||
    decoded.length ===
      0
  ) {
    return null;
  }

  const bytes =
    new Uint8Array(
      decoded
    );

  const header =
    bytes[0];

  if (
    header ===
      undefined
  ) {
    return null;
  }

  const addressType =
    header >>> 4;

  const networkId =
    header & 0x0f;

  /*
   * Cardano mainnet network id = 1.
   */
  if (
    networkId !==
      1
  ) {
    return null;
  }

  if (
    hrp === "addr" &&
    ![
      0, 1, 2, 3,
      4, 5, 6, 7,
    ].includes(
      addressType
    )
  ) {
    return null;
  }

  if (
    hrp === "stake" &&
    ![
      14,
      15,
    ].includes(
      addressType
    )
  ) {
    return null;
  }

  return {
    hrp,
    bytes,
    addressType,
    networkId,
  };
}

export function isCardanoMainnetAddress(
  value:
    string
) {
  return (
    decodeCardanoMainnetAddress(
      value
    ) !== null
  );
}

export function isCardanoPaymentAddress(
  value:
    string
) {
  return (
    decodeCardanoMainnetAddress(
      value
    )?.hrp ===
    "addr"
  );
}

export function isCardanoStakeAddress(
  value:
    string
) {
  return (
    decodeCardanoMainnetAddress(
      value
    )?.hrp ===
    "stake"
  );
}
