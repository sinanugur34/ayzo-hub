export function redisRuntimePrefix(
  environment:
    string | null | undefined =
      process.env.VERCEL_ENV
) {
  const normalized =
    environment
      ?.trim()
      .toLowerCase();

  /*
   * CRITICAL BACKWARD COMPATIBILITY:
   *
   * Production keeps the historical Redis
   * key format exactly as-is.
   *
   * This means deploying this change does NOT
   * reset existing production quotas,
   * rate-limits or user counters.
   */
  if (
    !normalized ||
    normalized === "production"
  ) {
    return "";
  }

  if (
    normalized === "preview"
  ) {
    return "preview:";
  }

  if (
    normalized === "development"
  ) {
    return "development:";
  }

  /*
   * Unknown Vercel environments must never
   * silently collide with production keys.
   */
  return `${normalized}:`;
}
