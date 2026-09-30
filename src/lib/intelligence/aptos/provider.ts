import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeAptosAddress,
} from "./address";

import {
  getAptosAnalysisPolicy,
} from "./policy";

import type {
  AptosEvidence,
  AptosMoveResourceEvidence,
  AptosObservedTransaction,
  AptosProviderResult,
} from "./types";

const DEFAULT_APTOS_URL =
  "https://api.mainnet.aptoslabs.com/v1";

type JsonRecord =
  Record<string, unknown>;

export type AptosFetch =
  (
    input: string,
    init?: RequestInit
  ) => Promise<{
    ok: boolean;
    status: number;
    headers?: {
      get(name: string): string | null;
    };
    json(): Promise<unknown>;
  }>;

export type AptosProviderDependencies = {
  fetchImpl:
    AptosFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  AptosProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .APTOS_MAINNET_URL
        ?.trim() ||
      DEFAULT_APTOS_URL,

    timeoutMs:
      12_000,
  };

function record(
  value: unknown
): JsonRecord | null {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : null;
}

function array(
  value: unknown
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function text(
  value: unknown
) {
  return typeof value === "string"
    ? value
    : null;
}

function bool(
  value: unknown
) {
  return typeof value === "boolean"
    ? value
    : null;
}

function numberValue(
  value: unknown
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function resourceIdentity(
  type:
    string
) {
  const parts =
    type.split("::");

  return {
    moduleAddress:
      parts[0] ??
      null,

    moduleName:
      parts[1] ??
      null,

    structName:
      parts[2]
        ?.split("<")[0] ??
      null,
  };
}

function parseResource(
  value: unknown
): AptosMoveResourceEvidence | null {
  const row =
    record(value);

  const type =
    text(
      row?.type
    );

  if (!type) {
    return null;
  }

  return {
    type,
    ...resourceIdentity(
      type
    ),
  };
}

function parseTransaction(
  value: unknown
): AptosObservedTransaction | null {
  const row =
    record(value);

  const hash =
    text(
      row?.hash
    );

  if (!hash) {
    return null;
  }

  const payload =
    record(
      row?.payload
    );

  const functionName =
    text(
      payload?.function
    );

  let moduleAddress:
    string | null =
      null;

  let moduleName:
    string | null =
      null;

  let methodName:
    string | null =
      null;

  if (functionName) {
    const parts =
      functionName.split(
        "::"
      );

    moduleAddress =
      parts[0] ??
      null;

    moduleName =
      parts[1] ??
      null;

    methodName =
      parts[2] ??
      null;
  }

  return {
    transactionHash:
      hash,

    version:
      text(
        row?.version
      ),

    timestamp:
      text(
        row?.timestamp
      ),

    sender:
      text(
        row?.sender
      ),

    success:
      bool(
        row?.success
      ),

    vmStatus:
      text(
        row?.vm_status
      ),

    gasUsed:
      text(
        row?.gas_used
      ),

    gasUnitPrice:
      text(
        row?.gas_unit_price
      ),

    sequenceNumber:
      text(
        row?.sequence_number
      ),

    replayProtectionNonce:
      text(
        row?.replay_protection_nonce
      ),

    moduleAddress,

    moduleName,

    functionName:
      methodName,

    payloadArguments:
      array(
        payload?.arguments
      ),

    events:
      array(
        row?.events
      )
        .map(item => {
          const event =
            record(item);

          if (!event) {
            return null;
          }

          const guid =
            record(
              event.guid
            );

          return {
            type:
              text(
                event.type
              ),

            accountAddress:
              text(
                guid
                  ?.account_address
              ),

            sequenceNumber:
              text(
                event.sequence_number
              ),

            creationNumber:
              text(
                guid
                  ?.creation_number
              ),

            data:
              record(
                event.data
              ),
          };
        })
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !== null
        ),

    changes:
      array(
        row?.changes
      )
        .map(item => {
          const change =
            record(item);

          if (!change) {
            return null;
          }

          const data =
            record(
              change.data
            );

          return {
            type:
              text(
                change.type
              ) ??
              "unknown",

            address:
              text(
                change.address
              ),

            stateKeyHash:
              text(
                change
                  .state_key_hash
              ),

            resource:
              text(
                data?.type
              ),
          };
        })
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !== null
        ),
  };
}

async function request(
  url: string,
  deps:
    AptosProviderDependencies
): Promise<
  | {
      ok: true;
      data: unknown;
      headers:
        (
          (
            name:
              string
          ) =>
            string | null
        ) | null;
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR"
        | "MALFORMED_RESPONSE";
      error:
        string;
    }
> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      deps.timeoutMs
    );

  try {
    const response =
      await deps.fetchImpl(
        url,
        {
          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      return {
        ok: false,
        code:
          response.status === 404
            ? "NOT_FOUND"
            : response.status === 429
              ? "RATE_LIMITED"
              : "UPSTREAM_ERROR",
        error:
          `Aptos HTTP ${response.status}.`,
      };
    }

    try {
      return {
        ok: true,
        data:
          await response.json(),
        headers:
          response.headers
            ?.get.bind(
              response.headers
            ) ??
          null,
      };
    } catch {
      return {
        ok: false,
        code:
          "MALFORMED_RESPONSE",
        error:
          "Aptos returned invalid JSON.",
      };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return {
        ok: false,
        code:
          "TIMEOUT",
        error:
          "Aptos request timed out.",
      };
    }

    return {
      ok: false,
      code:
        "UPSTREAM_ERROR",
      error:
        "Aptos request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAptosEvidence(
  {
    address,
    analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    AptosProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  AptosProviderResult<
    AptosEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeAptosAddress(
      address
    );

  if (!normalized) {
    return {
      ok: false,
      providerId:
        "aptos-fullnode",
      latencyMs:
        Date.now() -
        started,
      code:
        "INVALID_ADDRESS",
      error:
        "Invalid Aptos address.",
    };
  }

  const policy =
    getAptosAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const run =
    async (
      path: string
    ) => {
      if (
        requestsUsed >=
        policy
          .providerRequestBudget
      ) {
        return {
          ok: false as const,
          code:
            "UPSTREAM_ERROR" as const,
          error:
            "Aptos provider request budget exhausted.",
        };
      }

      requestsUsed += 1;

      return request(
        `${deps.baseUrl}${path}`,
        deps
      );
    };

  const ledger =
    await run("");

  if (!ledger.ok) {
    return {
      ok: false,
      providerId:
        "aptos-fullnode",
      latencyMs:
        Date.now() -
        started,
      code:
        ledger.code,
      error:
        ledger.error,
    };
  }

  const ledgerRow =
    record(
      ledger.data
    );

  const account =
    await run(
      `/accounts/${encodeURIComponent(normalized)}`
    );

  /*
   * Under Aptos stateless-account semantics,
   * 404 does not make the hexadecimal address invalid.
   */
  const accountRow =
    account.ok
      ? record(
          account.data
        )
      : null;

  const resources =
    await run(
      `/accounts/${encodeURIComponent(normalized)}/resources`
    );

  const resourceRows =
    resources.ok
      ? array(
          resources.data
        )
      : [];

  const parsedResources =
    resourceRows
      .map(
        parseResource
      )
      .filter(
        (
          item
        ): item is AptosMoveResourceEvidence =>
          item !== null
      )
      .slice(
        0,
        policy.resourceLimit
      );

  let aptBalanceOctas =
    "0";

  for (
    const raw of
    resourceRows
  ) {
    const row =
      record(raw);

    if (
      text(
        row?.type
      ) !==
        "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    ) {
      continue;
    }

    const data =
      record(
        row?.data
      );

    const coin =
      record(
        data?.coin
      );

    aptBalanceOctas =
      text(
        coin?.value
      ) ??
      "0";

    break;
  }

  const txResult =
    await run(
      `/accounts/${encodeURIComponent(normalized)}/transactions?limit=${policy.transactionLimit}`
    );

  const transactions =
    txResult.ok
      ? array(
          txResult.data
        )
          .map(
            parseTransaction
          )
          .filter(
            (
              item
            ): item is AptosObservedTransaction =>
              item !== null
          )
      : [];

  /*
   * Fullnode account history is newest/current bounded evidence here.
   * Oldest/pruned boundary is explicitly represented in coverage.
   * Indexed earliest-history work is a later provider module.
   */
  const oldestVersion =
    ledger.headers
      ? ledger.headers(
          "X-APTOS-LEDGER-OLDEST-VERSION"
        )
      : null;

  return {
    ok: true,
    providerId:
      "aptos-fullnode",
    latencyMs:
      Date.now() -
      started,
    data: {
      chainId:
        numberValue(
          ledgerRow?.chain_id
        ),

      ledgerVersion:
        text(
          ledgerRow?.ledger_version
        ),

      account: {
        address:
          normalized,

        sequenceNumber:
          text(
            accountRow
              ?.sequence_number
          ),

        authenticationKey:
          text(
            accountRow
              ?.authentication_key
          ),

        statelessCompatible:
          !account.ok &&
          account.code ===
            "NOT_FOUND",
      },

      aptBalanceOctas,

      fungibleAssets:
        [],

      resources:
        parsedResources,

      objects:
        [],

      transactions,

      earliestTransactions:
        [],

      coverage: {
        plan:
          analysisPlan,

        transactionLimit:
          policy
            .transactionLimit,

        earliestTransactionLimit:
          policy
            .earliestTransactionLimit,

        fungibleAssetLimit:
          policy
            .fungibleAssetLimit,

        resourceLimit:
          policy.resourceLimit,

        objectLimit:
          policy.objectLimit,

        eventLimit:
          policy.eventLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        transactionHistoryMayBePruned:
          oldestVersion !==
            null,

        transactionHistoryHasMore:
          transactions.length >=
            policy
              .transactionLimit,
      },
    },
  };
}
