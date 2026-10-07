import {
  AsyncLocalStorage,
} from "node:async_hooks";

import type {
  ProviderUsageCaptureInput,
  ProviderUsageContext,
  ProviderUsageEvent,
} from "./providerUsageTelemetryCore";

import {
  buildProviderUsageEvent,
  normalizeProviderUsageContext,
} from "./providerUsageTelemetryCore";

type ProviderUsageScopeStore = {
  context:
    ProviderUsageContext;

  events:
    ProviderUsageEvent[];
};

const storage =
  new AsyncLocalStorage<
    ProviderUsageScopeStore
  >();

export type ProviderUsageExecutionHints = {
  attempt?:
    number;

  fallbackUsed?:
    boolean;
};

const hintStorage =
  new AsyncLocalStorage<
    ProviderUsageExecutionHints
  >();

export type ProviderUsageScopeResult<T> = {
  value:
    T;

  events:
    readonly ProviderUsageEvent[];
};

export async function runWithProviderUsageScopeCore<T>(
  context:
    ProviderUsageContext,

  callback:
    () => Promise<T>
): Promise<
  ProviderUsageScopeResult<T>
> {
  const normalized =
    normalizeProviderUsageContext(
      context
    );

  const store:
    ProviderUsageScopeStore = {
      context:
        normalized,

      events:
        [],
    };

  const value =
    await storage.run(
      store,
      callback
    );

  return {
    value,

    events: [
      ...store.events,
    ],
  };
}

export function captureProviderUsageCore(
  input:
    ProviderUsageCaptureInput
): boolean {
  const store =
    storage.getStore();

  if (!store) {
    /*
     * Provider code can run from tests,
     * health checks or non-analysis jobs.
     *
     * Telemetry must never become a hard
     * dependency of provider execution.
     */
    return false;
  }

  try {
    store.events.push(
      buildProviderUsageEvent(
        store.context,
        input
      )
    );

    return true;
  } catch {
    /*
     * Invalid telemetry must never fail
     * blockchain intelligence execution.
     */
    return false;
  }
}

export async function runWithProviderUsageHintsCore<T>(
  hints:
    ProviderUsageExecutionHints,

  callback:
    () => Promise<T>
): Promise<T> {
  return hintStorage.run(
    {
      attempt:
        hints.attempt,

      fallbackUsed:
        hints.fallbackUsed ===
        true,
    },

    callback
  );
}

export function readProviderUsageHintsCore():
  ProviderUsageExecutionHints |
  null {
  return (
    hintStorage
      .getStore() ??
    null
  );
}

export function readProviderUsageScopeCore():
  ProviderUsageContext |
  null {
  return (
    storage
      .getStore()
      ?.context ??
    null
  );
}
