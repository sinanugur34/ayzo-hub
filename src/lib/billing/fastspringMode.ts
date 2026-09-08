export type FastSpringMode =
  | "test"
  | "live";

export function parseFastSpringMode(
  value:
    string | null | undefined
): FastSpringMode {
  const mode =
    value?.trim();

  if (
    mode === "test" ||
    mode === "live"
  ) {
    return mode;
  }

  throw new Error(
    "Invalid FastSpring mode."
  );
}

export function fastSpringModeIsLive(
  mode:
    FastSpringMode
) {
  return mode ===
    "live";
}

export function fastSpringCheckoutHost(
  storeId:
    string,
  mode:
    FastSpringMode
) {
  return mode ===
    "test"
    ? `${storeId}.test.onfastspring.com`
    : `${storeId}.onfastspring.com`;
}

export function fastSpringEventMatchesMode(
  eventLive:
    boolean,
  mode:
    FastSpringMode
) {
  return (
    eventLive ===
    fastSpringModeIsLive(
      mode
    )
  );
}
