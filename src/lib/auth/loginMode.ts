export type LoginMode =
  | "signin"
  | "signup";

export function resolveLoginMode(
  value:
    | string
    | string[]
    | undefined
): LoginMode {
  const candidate =
    Array.isArray(
      value
    )
      ? value[0]
      : value;

  return candidate ===
    "signup"
    ? "signup"
    : "signin";
}
