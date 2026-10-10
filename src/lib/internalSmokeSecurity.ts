/**
 * Legacy smoke exception restricted to local development; deployed Vercel
 * environments never bypass the internal API key, even with a smoke header.
 * Do not expose a local development server to untrusted clients.
 */
export type LocalSmokeEnvironment = Readonly<{
  nodeEnv?: string;
  vercelEnv?: string;
}>;

export function isLocalDevelopmentSmokeAllowed(
  env: LocalSmokeEnvironment,
  headerValue: string | null,
): boolean {
  return env.nodeEnv !== "production" &&
    !env.vercelEnv &&
    headerValue === "smoke";
}

export function isLocalDevelopmentSmokeRequest(request: Request): boolean {
  return isLocalDevelopmentSmokeAllowed(
    { nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV },
    request.headers.get("x-ayzo-test-request"),
  );
}
