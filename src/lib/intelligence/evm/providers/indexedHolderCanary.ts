export type IndexedHolderCanaryEnvironment = Readonly<{
  flag?: string;
  nodeEnv?: string;
  vercelEnv?: string;
}>;

/**
 * Production is never permitted to opt into an uncertified provider.
 * Vercel Preview builds use NODE_ENV=production, so VERCEL_ENV owns this gate.
 */
export function isIndexedHolderCanaryAllowed(
  env: IndexedHolderCanaryEnvironment,
): boolean {
  if (env.flag !== "1") return false;
  if (env.vercelEnv === "preview") return true;
  return env.nodeEnv === "development" && !env.vercelEnv;
}
