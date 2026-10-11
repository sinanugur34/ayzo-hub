import { createHash, timingSafeEqual } from "node:crypto";

/** Deployment auth for one dedicated Git Preview branch, never Production. */
export type IsolatedPreviewAuthConfig = Readonly<{
  vercelEnv?: string;
  vercelGitRef?: string;
  enabled?: string;
  secret?: string;
}>;

const HEX64 = /^[a-f0-9]{64}$/;
const DIRECT_HOST = /^ayzo-[a-z0-9-]+\.vercel\.app$/;
const TEST_BRANCH = "feat/ayzo-phase22729-holder-e2e";

export function previewHolderAuthAllowed(
  config: IsolatedPreviewAuthConfig,
  requestHost: string | null,
  provided: string | null,
): boolean {
  if (config.vercelEnv !== "preview" || config.enabled !== "1") return false;
  // Branch must be set by Vercel Git metadata for a dedicated deployment.
  if (config.vercelGitRef !== TEST_BRANCH) return false;
  if (typeof requestHost !== "string" || !DIRECT_HOST.test(requestHost)) return false;
  if (typeof config.secret !== "string" || !HEX64.test(config.secret)) return false;
  if (typeof provided !== "string" || !HEX64.test(provided)) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(config.secret, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function isIsolatedPreviewHolderTestRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol !== "https:" || url.port !== "") return false;
  return previewHolderAuthAllowed({
    vercelEnv: process.env.VERCEL_ENV,
    vercelGitRef: process.env.VERCEL_GIT_COMMIT_REF,
    enabled: process.env.AYZO_PREVIEW_HOLDER_TEST_ENABLED,
    secret: process.env.AYZO_PREVIEW_HOLDER_TEST_KEY,
  }, url.hostname, request.headers.get("x-ayzo-preview-holder-test-key"));
}
