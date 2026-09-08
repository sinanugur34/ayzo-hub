export function parseProCheckoutEnabled(
  value: string | null | undefined
) {
  return value?.trim() === "true";
}
