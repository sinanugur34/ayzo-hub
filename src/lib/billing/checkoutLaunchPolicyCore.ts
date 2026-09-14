export function parsePaidCheckoutEnabled(
  value: string | null | undefined
) {
  return value?.trim() === "true";
}
