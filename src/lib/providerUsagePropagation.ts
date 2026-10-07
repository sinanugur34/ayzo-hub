import "server-only";

import {
  getInternalApiKey,
  isInternalApiRequest,
} from "@/lib/apiSecurity";

import {
  persistProviderUsageEvents,
} from "@/lib/providerUsageTelemetry";

import {
  readProviderUsageScope,
  runWithProviderUsageScope,
} from "@/lib/providerUsageScope";

import {
  decodeProviderUsagePropagation,
  encodeProviderUsagePropagation,
  PROVIDER_USAGE_CONTEXT_HEADER,
  PROVIDER_USAGE_SIGNATURE_HEADER,
} from "@/lib/providerUsagePropagationCore";

import type {
  ProviderUsageContext,
} from "@/lib/providerUsageTelemetryCore";

export {
  PROVIDER_USAGE_CONTEXT_HEADER,
  PROVIDER_USAGE_SIGNATURE_HEADER,
};

export function buildProviderUsagePropagationHeaders():
  Record<
    string,
    string
  > {
  const context =
    readProviderUsageScope();

  /*
   * Provider code also runs outside an
   * analysis scope during tests, health checks,
   * maintenance and development utilities.
   */
  if (!context) {
    return {};
  }

  try {
    const encoded =
      encodeProviderUsagePropagation(
        context,
        getInternalApiKey()
      );

    return {
      [PROVIDER_USAGE_CONTEXT_HEADER]:
        encoded.contextHeader,

      [PROVIDER_USAGE_SIGNATURE_HEADER]:
        encoded.signatureHeader,
    };
  } catch {
    /*
     * Propagation is observability only.
     * Never make intelligence unavailable.
     */
    return {};
  }
}

export function readProviderUsagePropagationContext(
  request:
    Request
): ProviderUsageContext | null {
  /*
   * Defense in depth.
   *
   * Even a correctly signed telemetry envelope
   * is accepted only on AYZO internal requests.
   */
  if (
    !isInternalApiRequest(
      request
    )
  ) {
    return null;
  }

  const contextHeader =
    request.headers.get(
      PROVIDER_USAGE_CONTEXT_HEADER
    );

  const signatureHeader =
    request.headers.get(
      PROVIDER_USAGE_SIGNATURE_HEADER
    );

  if (
    !contextHeader &&
    !signatureHeader
  ) {
    return null;
  }

  if (
    !contextHeader ||
    !signatureHeader
  ) {
    return null;
  }

  try {
    return decodeProviderUsagePropagation(
      {
        contextHeader,
        signatureHeader,
      },

      getInternalApiKey()
    );
  } catch {
    return null;
  }
}

export async function runWithPropagatedProviderUsage<T>(
  request:
    Request,

  callback:
    () => Promise<T>
): Promise<T> {
  const context =
    readProviderUsagePropagationContext(
      request
    );

  if (!context) {
    return callback();
  }

  const {
    value,
    events,
  } =
    await runWithProviderUsageScope(
      context,
      callback
    );

  /*
   * Child Solana routes run in a separate
   * server request, so their AsyncLocalStorage
   * event arrays cannot be merged in memory
   * with the parent request.
   *
   * Persisting them independently is safe:
   * every event keeps the same analysis_id.
   */
  await persistProviderUsageEvents(
    events
  );

  return value;
}
