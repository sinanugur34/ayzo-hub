import {
  randomUUID,
  createHash,
} from "node:crypto";

import {
  Redis,
} from "@upstash/redis";

import type {
  EvmPaginatedAddressRequest,
  EvmTransactionsProvider,
} from "../provider";

import type {
  EvmProviderFailure,
  EvmProviderResult,
  EvmProviderSuccess,
  EvmTransactionsPage,
} from "../types";

import {
  alchemyTransactionsProvider,
} from "./alchemyTransactions";

import {
  etherscanTransactionsProvider,
} from "./etherscanTransactions";

import {
  goldRushTransactionsProvider,
} from "./goldrushTransactions";

export type TransactionResilienceStore = {
  get<T = unknown>(
    key:
      string
  ): Promise<
    T | null
  >;

  set(
    key:
      string,
    value:
      unknown,
    options: {
      ex:
        number;
      nx?:
        boolean;
    }
  ): Promise<
    unknown
  >;

  del(
    ...keys:
      string[]
  ): Promise<
    unknown
  >;
};

export type TransactionResilienceDependencies = {
  providers?:
    readonly EvmTransactionsProvider[];

  store?:
    TransactionResilienceStore | null;

  cacheTtlSeconds?:
    number;

  lockTtlSeconds?:
    number;
};

const DEFAULT_PROVIDERS:
  readonly EvmTransactionsProvider[] = [
  goldRushTransactionsProvider,
  alchemyTransactionsProvider,
  etherscanTransactionsProvider,
];

type TransactionCursorOwner =
  | "goldrush"
  | "alchemy"
  | "etherscan"
  | null;

function transactionCursorOwner(
  cursor:
    string | null | undefined
): TransactionCursorOwner {
  if (!cursor) {
    return null;
  }

  if (
    cursor.startsWith(
      "alchemy:"
    )
  ) {
    return "alchemy";
  }

  if (
    cursor.startsWith(
      "goldrush:"
    )
  ) {
    return "goldrush";
  }

  if (
    cursor.startsWith(
      "etherscan:"
    )
  ) {
    return "etherscan";
  }

  /*
   * Legacy numeric cursors historically
   * belonged to GoldRush. Keep them
   * compatible without allowing another
   * provider to consume ambiguous state.
   */
  if (/^\d+$/.test(cursor)) {
    return "goldrush";
  }

  return null;
}

function requestForProvider(
  request:
    EvmPaginatedAddressRequest,
  provider:
    EvmTransactionsProvider
): EvmPaginatedAddressRequest {
  const cursor =
    request.cursor;

  if (!cursor) {
    return request;
  }

  if (
    provider.id ===
      "goldrush" &&
    cursor.startsWith(
      "goldrush:"
    )
  ) {
    return {
      ...request,
      cursor:
        cursor.slice(
          "goldrush:".length
        ),
    };
  }

  if (
    provider.id ===
      "etherscan" &&
    cursor.startsWith(
      "etherscan:"
    )
  ) {
    return {
      ...request,
      cursor:
        cursor.slice(
          "etherscan:".length
        ),
    };
  }

  return request;
}

const ROOT_CACHE_TTL_SECONDS =
  60;

const PAGE_CACHE_TTL_SECONDS =
  120;

const DEFAULT_LOCK_TTL_SECONDS =
  30;

const LOCK_WAIT_ATTEMPTS =
  8;

const LOCK_WAIT_MS =
  125;

let redisClient:
  Redis | null | undefined;

function getProductionStore():
  TransactionResilienceStore | null {
  if (
    redisClient !==
    undefined
  ) {
    return redisClient as unknown as
      TransactionResilienceStore | null;
  }

  const url =
    process.env
      .KV_REST_API_URL
      ?.trim();

  const token =
    process.env
      .KV_REST_API_TOKEN
      ?.trim();

  if (
    !url ||
    !token
  ) {
    redisClient =
      null;

    return null;
  }

  redisClient =
    new Redis({
      url,
      token,
    });

  return redisClient as unknown as
    TransactionResilienceStore;
}

function resolveStore(
  dependencies:
    TransactionResilienceDependencies
) {
  return dependencies
    .store ===
    undefined
      ? getProductionStore()
      : dependencies.store;
}

function resilienceNamespace() {
  const vercelEnv =
    process.env
      .VERCEL_ENV
      ?.trim()
      .toLowerCase();

  if (
    vercelEnv ===
      "production" ||
    vercelEnv ===
      "preview" ||
    vercelEnv ===
      "development"
  ) {
    return vercelEnv;
  }

  return process.env
    .NODE_ENV ===
      "production"
    ? "production"
    : "development";
}

function requestDigest(
  request:
    EvmPaginatedAddressRequest
) {
  const raw =
    [
      request.network
        .networkId,

      request.address
        .trim()
        .toLowerCase(),

      request.cursor ??
        "root",

      request.limit ??
        "default",
    ].join(
      ":"
    );

  return createHash(
    "sha256"
  )
    .update(
      raw
    )
    .digest(
      "hex"
    );
}

function cacheKey(
  request:
    EvmPaginatedAddressRequest
) {
  return (
    `ayzo:${resilienceNamespace()}:evm:transactions:v2:cache:` +
    requestDigest(
      request
    )
  );
}

function lockKey(
  request:
    EvmPaginatedAddressRequest
) {
  return (
    `ayzo:${resilienceNamespace()}:evm:transactions:v2:lock:` +
    requestDigest(
      request
    )
  );
}

function circuitKey(
  provider:
    EvmTransactionsProvider,
  request:
    EvmPaginatedAddressRequest
) {
  return [
    "ayzo",

    resilienceNamespace(),

    "evm",
    "transactions",
    "v2",
    "circuit",
    provider.id,
    request.network
      .networkId,
  ].join(
    ":"
  );
}

function isCachedSuccess(
  value:
    unknown
): value is EvmProviderSuccess<
  EvmTransactionsPage
> {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return false;
  }

  const root =
    value as Record<
      string,
      unknown
    >;

  if (
    root.ok !==
      true ||
    typeof root.providerId !==
      "string" ||
    typeof root.latencyMs !==
      "number"
  ) {
    return false;
  }

  const data =
    root.data;

  if (
    typeof data !==
      "object" ||
    data ===
      null ||
    Array.isArray(
      data
    )
  ) {
    return false;
  }

  const page =
    data as Record<
      string,
      unknown
    >;

  return (
    Array.isArray(
      page.transactions
    ) &&
    (
      page.nextCursor ===
        null ||
      typeof page.nextCursor ===
        "string"
    )
  );
}

async function readCache(
  store:
    TransactionResilienceStore | null,
  request:
    EvmPaginatedAddressRequest
): Promise<
  EvmProviderSuccess<
    EvmTransactionsPage
  > | null
> {
  if (!store) {
    return null;
  }

  try {
    const cached =
      await store.get<
        unknown
      >(
        cacheKey(
          request
        )
      );

    return isCachedSuccess(
      cached
    )
      ? cached
      : null;
  } catch {
    return null;
  }
}

async function writeCache(
  store:
    TransactionResilienceStore | null,
  request:
    EvmPaginatedAddressRequest,
  result:
    EvmProviderSuccess<
      EvmTransactionsPage
    >,
  ttlSeconds:
    number
) {
  if (!store) {
    return;
  }

  try {
    await store.set(
      cacheKey(
        request
      ),
      result,
      {
        ex:
          ttlSeconds,
      }
    );
  } catch {
    // Cache failure must never break analysis.
  }
}

async function isCircuitOpen(
  store:
    TransactionResilienceStore | null,
  provider:
    EvmTransactionsProvider,
  request:
    EvmPaginatedAddressRequest
) {
  if (!store) {
    return false;
  }

  try {
    const value =
      await store.get(
        circuitKey(
          provider,
          request
        )
      );

    return value !==
      null;
  } catch {
    return false;
  }
}

function circuitTtlSeconds(
  failure:
    EvmProviderFailure
) {
  const error =
    failure.error
      .toLowerCase();

  if (
    error.includes(
      "credit limit"
    ) ||
    error.includes(
      "spending limit"
    ) ||
    error.includes(
      "quota"
    ) ||
    error.includes(
      "insufficient credit"
    ) ||
    error.includes(
      "upgrade your plan"
    )
  ) {
    return 1800;
  }

  if (
    error.includes(
      "invalid api key"
    ) ||
    error.includes(
      "not supported for this chain"
    )
  ) {
    return 600;
  }

  if (
    failure.code ===
      "RATE_LIMITED"
  ) {
    return 60;
  }

  if (
    failure.code ===
      "TIMEOUT"
  ) {
    return 30;
  }

  if (
    failure.code ===
      "UPSTREAM_ERROR"
  ) {
    return 90;
  }

  return 0;
}

async function openCircuit(
  store:
    TransactionResilienceStore | null,
  provider:
    EvmTransactionsProvider,
  request:
    EvmPaginatedAddressRequest,
  failure:
    EvmProviderFailure
) {
  if (!store) {
    return;
  }

  const ttl =
    circuitTtlSeconds(
      failure
    );

  if (
    ttl <= 0
  ) {
    return;
  }

  try {
    await store.set(
      circuitKey(
        provider,
        request
      ),
      {
        code:
          failure.code,

        openedAt:
          Date.now(),
      },
      {
        ex:
          ttl,
      }
    );
  } catch {
    // Circuit storage failure must fail open.
  }
}

async function clearCircuit(
  store:
    TransactionResilienceStore | null,
  provider:
    EvmTransactionsProvider,
  request:
    EvmPaginatedAddressRequest
) {
  if (!store) {
    return;
  }

  try {
    await store.del(
      circuitKey(
        provider,
        request
      )
    );
  } catch {
    // Never fail analysis because circuit cleanup failed.
  }
}

async function acquireLock(
  store:
    TransactionResilienceStore | null,
  request:
    EvmPaginatedAddressRequest,
  token:
    string,
  ttlSeconds:
    number
) {
  if (!store) {
    return false;
  }

  try {
    const result =
      await store.set(
        lockKey(
          request
        ),
        token,
        {
          ex:
            ttlSeconds,

          nx:
            true,
        }
      );

    return result !==
      null;
  } catch {
    /*
     * Redis failure should not block provider calls.
     * Treat this caller as lock owner and continue.
     */
    return true;
  }
}

async function releaseLock(
  store:
    TransactionResilienceStore | null,
  request:
    EvmPaginatedAddressRequest,
  token:
    string
) {
  if (!store) {
    return;
  }

  try {
    const current =
      await store.get<
        string
      >(
        lockKey(
          request
        )
      );

    if (
      current ===
        token
    ) {
      await store.del(
        lockKey(
          request
        )
      );
    }
  } catch {
    // Lock naturally expires.
  }
}

async function waitForPeerCache(
  store:
    TransactionResilienceStore | null,
  request:
    EvmPaginatedAddressRequest
) {
  if (!store) {
    return null;
  }

  for (
    let attempt =
      0;
    attempt <
      LOCK_WAIT_ATTEMPTS;
    attempt +=
      1
  ) {
    await new Promise<
      void
    >(
      resolve =>
        setTimeout(
          resolve,
          LOCK_WAIT_MS
        )
    );

    const cached =
      await readCache(
        store,
        request
      );

    if (cached) {
      return cached;
    }
  }

  return null;
}

export async function getResilientEvmTransactions(
  request:
    EvmPaginatedAddressRequest,
  dependencies:
    TransactionResilienceDependencies = {}
): Promise<
  EvmProviderResult<
    EvmTransactionsPage
  >
> {
  const providers =
    dependencies
      .providers ??
    DEFAULT_PROVIDERS;

  const store =
    resolveStore(
      dependencies
    );

  const cached =
    await readCache(
      store,
      request
    );

  if (cached) {
    return cached;
  }

  const token =
    randomUUID();

  const lockOwned =
    await acquireLock(
      store,
      request,
      token,
      dependencies
        .lockTtlSeconds ??
        DEFAULT_LOCK_TTL_SECONDS
    );

  if (
    store &&
    !lockOwned
  ) {
    const peerCached =
      await waitForPeerCache(
        store,
        request
      );

    if (peerCached) {
      return peerCached;
    }
  }

  let lastFailure:
    EvmProviderFailure | null =
      null;

  const cursorOwner =
    transactionCursorOwner(
      request.cursor
    );

  try {
    for (
      const provider
      of providers
    ) {
      if (
        cursorOwner &&
        provider.id !==
          cursorOwner
      ) {
        continue;
      }
      if (
        !provider
          .supportsNetwork(
            request.network
          ) ||
        !provider
          .supportsCapability(
            "transactions"
          )
      ) {
        continue;
      }

      if (
        await isCircuitOpen(
          store,
          provider,
          request
        )
      ) {
        continue;
      }

      const providerRequest =
        requestForProvider(
          request,
          provider
        );

      const result =
        await provider
          .getTransactions(
            providerRequest
          );

      if (
        result.ok
      ) {
        await clearCircuit(
          store,
          provider,
          request
        );

        const cacheTtl =
          dependencies
            .cacheTtlSeconds ??
          (
            request.cursor
              ? PAGE_CACHE_TTL_SECONDS
              : ROOT_CACHE_TTL_SECONDS
          );

        await writeCache(
          store,
          request,
          result,
          cacheTtl
        );

        return result;
      }

      lastFailure =
        result;

      await openCircuit(
        store,
        provider,
        request,
        result
      );
    }

    if (lastFailure) {
      return lastFailure;
    }

    return {
      ok:
        false,
      providerId:
        providers[0]
          ?.id ??
        "goldrush",
      latencyMs:
        null,
      code:
        "UPSTREAM_ERROR",
      error:
        "No EVM transaction provider is currently available.",
    };
  } finally {
    if (
      lockOwned
    ) {
      await releaseLock(
        store,
        request,
        token
      );
    }
  }
}
