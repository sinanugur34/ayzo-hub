import "server-only";

import {
  captureProviderUsageCore,
  readProviderUsageScopeCore,
  runWithProviderUsageScopeCore,
} from "@/lib/providerUsageScopeCore";

export type {
  ProviderUsageScopeResult,
} from "@/lib/providerUsageScopeCore";

/*
 * Production-facing telemetry scope.
 *
 * This wrapper is intentionally server-only.
 * The actual AsyncLocalStorage implementation
 * lives in providerUsageScopeCore so it can be
 * unit tested under the Node test runner.
 */

export const runWithProviderUsageScope =
  runWithProviderUsageScopeCore;

export const captureProviderUsage =
  captureProviderUsageCore;

export const readProviderUsageScope =
  readProviderUsageScopeCore;
