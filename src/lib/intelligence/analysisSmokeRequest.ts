import {
  isInternalApiRequest,
} from "@/lib/apiSecurity";

/*
 * Local/test smoke requests keep the historical
 * non-production behavior.
 *
 * A deployed Vercel Preview runs with NODE_ENV
 * production, so preview acceptance requires:
 *
 *   1. VERCEL_ENV === "preview"
 *   2. x-ayzo-test-request: smoke
 *   3. valid AYZO internal API key
 *
 * Production deployments can never enter this
 * bypass path, even with the internal key.
 */
export function isAuthorizedAnalysisSmokeRequest(
  request:
    Request
) {
  if (
    request.headers.get(
      "x-ayzo-test-request"
    ) !==
      "smoke"
  ) {
    return false;
  }

  if (
    process.env.NODE_ENV !==
      "production"
  ) {
    return true;
  }

  return (
    process.env.VERCEL_ENV ===
      "preview" &&
    isInternalApiRequest(
      request
    )
  );
}
