const BASE58 =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

export type ZcashAddressKind =
  | "transparent-p2pkh"
  | "transparent-p2sh"
  | "shielded-sapling"
  | "unified";

export function getZcashAddressKind(
  input: string
): ZcashAddressKind | null {
  const value =
    input.trim();

  if (
    value.startsWith("t1") &&
    value.length >= 26 &&
    value.length <= 40 &&
    BASE58.test(value)
  ) {
    return "transparent-p2pkh";
  }

  if (
    value.startsWith("t3") &&
    value.length >= 26 &&
    value.length <= 40 &&
    BASE58.test(value)
  ) {
    return "transparent-p2sh";
  }

  if (
    value.startsWith("zs") &&
    value.length > 20
  ) {
    return "shielded-sapling";
  }

  if (
    value.startsWith("u1") &&
    value.length > 20
  ) {
    return "unified";
  }

  return null;
}

export function normalizeZcashTransparentAddress(
  input: string
): string | null {
  const value =
    input.trim();

  const kind =
    getZcashAddressKind(
      value
    );

  if (
    kind !== "transparent-p2pkh" &&
    kind !== "transparent-p2sh"
  ) {
    return null;
  }

  return value;
}

export function isZcashShieldedOrUnifiedAddress(
  input: string
): boolean {
  const kind =
    getZcashAddressKind(
      input
    );

  return (
    kind === "shielded-sapling" ||
    kind === "unified"
  );
}
