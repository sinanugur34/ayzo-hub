/**
 * Opt-in PREVIEW/LOCAL safety boundary for the GoldRush retirement drill.
 * Never activate in Vercel Production, regardless of flag value.
 */
export type GoldRushExitEnvironment = Readonly<{
  flag?: string;
  nodeEnv?: string;
  vercelEnv?: string;
}>;

export function isGoldRushExitCanaryAllowed(env: GoldRushExitEnvironment): boolean {
  if (env.flag !== "1") return false;
  if (env.vercelEnv === "production") return false;
  if (env.vercelEnv === "preview") return true;
  return env.nodeEnv === "development" && !env.vercelEnv;
}

export function isGoldRushExitCanaryActive(): boolean {
  return isGoldRushExitCanaryAllowed({
    flag: process.env.AYZO_GOLDRUSH_EXIT_CANARY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
