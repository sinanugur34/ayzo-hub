function polymod(
  values:
    readonly number[]
) {
  const GEN = [
    0x3b6a57b2,
    0x26508e6d,
    0x1ea119fa,
    0x3d4233dd,
    0x2a1462b3,
  ];

  let chk =
    1;

  for (
    const value of
    values
  ) {
    const top =
      chk >>> 25;

    chk =
      (
        (
          chk &
          0x1ffffff
        ) << 5
      ) ^
      value;

    for (
      let i = 0;
      i < 5;
      i += 1
    ) {
      if (
        (
          (
            top >>
            i
          ) &
          1
        ) ===
        1
      ) {
        chk ^=
          GEN[i] ?? 0;
      }
    }
  }

  return chk >>> 0;
}

const CHARSET =
  "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function validateBech32(
  value:
    string,
  prefix:
    string
) {
  if (
    value !==
      value.toLowerCase() ||
    !value.startsWith(
      `${prefix}1`
    )
  ) {
    return false;
  }

  const separator =
    value.lastIndexOf(
      "1"
    );

  if (
    separator <=
      0 ||
    separator +
      7 >
      value.length
  ) {
    return false;
  }

  const hrp =
    value.slice(
      0,
      separator
    );

  const payload =
    value.slice(
      separator +
        1
    );

  const data:
    number[] = [];

  for (
    const char of
    payload
  ) {
    const index =
      CHARSET.indexOf(
        char
      );

    if (
      index < 0
    ) {
      return false;
    }

    data.push(index);
  }

  const expanded = [
    ...Array.from(
      hrp,
      char =>
        char.charCodeAt(
          0
        ) >>
        5
    ),

    0,

    ...Array.from(
      hrp,
      char =>
        char.charCodeAt(
          0
        ) &
        31
    ),

    ...data,
  ];

  return (
    polymod(
      expanded
    ) ===
    1
  );
}

export function normalizeCosmosAddress(
  value:
    string
): string | null {
  const normalized =
    value.trim();

  return validateBech32(
    normalized,
    "cosmos"
  )
    ? normalized
    : null;
}
