import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  getCosmosSdkPolicy,
  type CosmosSdkCoin,
  type CosmosSdkMessageEvidence,
  type CosmosSdkTransactionEvidence,
} from "@/lib/intelligence/cosmosSdk";

import {
  normalizeInjectiveAddress,
} from "./address";

const DEFAULT_OFFICIAL_EXPLORER =
  "https://k8s.global.mainnet.explorer.grpc-web.injective.network";

const DEFAULT_NOWNODES_EXPLORER =
  "https://inj-indexer.nownodes.io";

type JsonRecord =
  Record<string, unknown>;

export type InjectiveIndexedFetch =
  (
    input:
      string,
    init?:
      RequestInit
  ) => Promise<{
    ok:
      boolean;

    status:
      number;

    json():
      Promise<unknown>;
  }>;

export type InjectiveIndexedRestProvider = {
  transport?:
    "rest";

  id:
    string;

  baseUrl:
    string;

  apiKey:
    string | null;
};

export type InjectiveIndexedQuickNodeProvider = {
  transport:
    "quicknode-grpc";

  id:
    string;

  grpcEndpoint:
    string;

  token:
    string;
};

export type InjectiveIndexedProvider =
  | InjectiveIndexedRestProvider
  | InjectiveIndexedQuickNodeProvider;

export type InjectiveQuickNodeRawResult =
  | {
      ok:
        true;

      data:
        unknown;
    }
  | {
      ok:
        false;

      code:
        | "INVALID_ADDRESS"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR"
        | "MALFORMED_RESPONSE";

      error:
        string;
    };

export type InjectiveQuickNodeLoad =
  (
    input: {
      grpcEndpoint:
        string;

      token:
        string;

      address:
        string;

      limit:
        number;

      timeoutMs:
        number;
    }
  ) => Promise<
    InjectiveQuickNodeRawResult
  >;

export type InjectiveIndexedHistoryDependencies = {
  fetchImpl?:
    InjectiveIndexedFetch;

  timeoutMs?:
    number;

  providers?:
    readonly InjectiveIndexedProvider[];

  quickNodeLoad?:
    InjectiveQuickNodeLoad;
};

export type InjectiveIndexedHistoryResult =
  | {
      ok:
        true;

      providerId:
        string;

      latencyMs:
        number;

      data: {
        transactions:
          readonly CosmosSdkTransactionEvidence[];

        coverage: {
          transactionLimit:
            number;

          providerRequestsUsed:
            number;

          transportFailoverUsed:
            boolean;

          historyHasMore:
            boolean;

          total:
            number | null;
        };
      };
    }
  | {
      ok:
        false;

      providerId:
        string;

      latencyMs:
        number | null;

      providerRequestsUsed:
        number;

      code:
        | "INVALID_ADDRESS"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR"
        | "MALFORMED_RESPONSE";

      error:
        string;
    };

function record(
  value:
    unknown
): JsonRecord | null {
  if (
    typeof value ===
      "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return (
        typeof parsed ===
          "object" &&
        parsed !== null &&
        !Array.isArray(
          parsed
        )
      )
        ? parsed as
            JsonRecord
        : null;
    } catch {
      return null;
    }
  }

  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  )
    ? value as
        JsonRecord
    : null;
}

function array(
  value:
    unknown
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function text(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function integer(
  value:
    unknown
) {
  if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    /^\d+$/.test(
      value
    )
  ) {
    const parsed =
      Number(
        value
      );

    return Number.isSafeInteger(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function numericString(
  value:
    unknown
) {
  if (
    typeof value ===
      "string" &&
    /^-?\d+(?:\.\d+)?$/.test(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return String(
      value
    );
  }

  return null;
}

function coin(
  value:
    unknown
): CosmosSdkCoin | null {
  const row =
    record(
      value
    );

  const denom =
    text(
      row?.denom
    );

  const amount =
    numericString(
      row?.amount
    );

  if (
    !denom ||
    !amount
  ) {
    return null;
  }

  return {
    denom,
    amount,
  };
}

function coins(
  value:
    unknown
): CosmosSdkCoin[] {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(
        coin
      )
      .filter(
        (
          item
        ): item is CosmosSdkCoin =>
          item !== null
      );
  }

  const single =
    coin(
      value
    );

  return single
    ? [
        single,
      ]
    : [];
}

function nestedText(
  value:
    unknown,
  keys:
    readonly string[],
  depth =
    0
): string | null {
  if (
    depth > 7
  ) {
    return null;
  }

  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  for (
    const key of
    keys
  ) {
    const found =
      text(
        row[key]
      );

    if (found) {
      return found;
    }
  }

  for (
    const child of
    Object.values(
      row
    )
  ) {
    const found =
      nestedText(
        child,
        keys,
        depth + 1
      );

    if (found) {
      return found;
    }
  }

  return null;
}

function parseMessage(
  value:
    unknown
): CosmosSdkMessageEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const payload =
    record(
      row.value
    ) ??
    record(
      row.message
    ) ??
    record(
      row.msg
    ) ??
    row;

  const typeUrl =
    text(
      row["@type"]
    ) ??
    text(
      row.type
    ) ??
    text(
      row.type_url
    ) ??
    text(
      row.typeUrl
    ) ??
    text(
      payload["@type"]
    ) ??
    text(
      payload.type
    );

  if (!typeUrl) {
    return null;
  }

  const messageCoins =
    coins(
      payload.amount
    );

  if (
    messageCoins.length ===
      0
  ) {
    const token =
      coin(
        payload.token
      );

    if (token) {
      messageCoins.push(
        token
      );
    }
  }

  return {
    typeUrl,

    sender:
      nestedText(
        payload,
        [
          "from_address",
          "sender",
          "delegator_address",
          "creator",
        ]
      ),

    recipient:
      nestedText(
        payload,
        [
          "to_address",
          "receiver",
          "recipient",
        ]
      ),

    validatorAddress:
      nestedText(
        payload,
        [
          "validator_address",
          "validator_src_address",
          "validator_dst_address",
        ]
      ),

    sourcePort:
      nestedText(
        payload,
        [
          "source_port",
        ]
      ),

    sourceChannel:
      nestedText(
        payload,
        [
          "source_channel",
        ]
      ),

    contractAddress:
      nestedText(
        payload,
        [
          "contract",
          "contract_address",
        ]
      ),

    coins:
      messageCoins,
  };
}

function timestamp(
  row:
    JsonRecord
) {
  const raw =
    text(
      row.block_timestamp
    );

  if (
    raw &&
    !/^\d+$/.test(
      raw
    )
  ) {
    return raw;
  }

  const numeric =
    integer(
      row.block_unix_timestamp
    ) ??
    integer(
      row.block_timestamp
    );

  if (
    numeric ===
      null
  ) {
    return null;
  }

  const millis =
    numeric >
      10_000_000_000
      ? numeric
      : numeric *
        1000;

  try {
    return new Date(
      millis
    ).toISOString();
  } catch {
    return null;
  }
}

function parseTransaction(
  value:
    unknown
): CosmosSdkTransactionEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const hash =
    text(
      row.hash
    );

  if (!hash) {
    return null;
  }

  return {
    hash,

    height:
      integer(
        row.block_number
      ) ??
      integer(
        row.blockNumber
      ),

    timestamp:
      timestamp(
        row
      ),

    code:
      integer(
        row.code
      ),

    messages:
      array(
        row.messages
      )
        .map(
          parseMessage
        )
        .filter(
          (
            item
          ): item is CosmosSdkMessageEvidence =>
            item !== null
        ),
  };
}

function providerErrorCode(
  status:
    number
) {
  if (
    status ===
      404
  ) {
    return "NOT_FOUND" as const;
  }

  if (
    status ===
      402 ||
    status ===
      403 ||
    status ===
      429
  ) {
    return "RATE_LIMITED" as const;
  }

  return "UPSTREAM_ERROR" as const;
}

function defaultProviders():
  InjectiveIndexedProvider[] {
  const official =
    process.env
      .INJECTIVE_EXPLORER_URL
      ?.trim() ||
    DEFAULT_OFFICIAL_EXPLORER;

  const quickNodeEndpoint =
    process.env
      .INJECTIVE_QUICKNODE_GRPC_ENDPOINT
      ?.trim() ||
    null;

  const quickNodeToken =
    process.env
      .INJECTIVE_QUICKNODE_TOKEN
      ?.trim() ||
    null;

  const nownodesEnabled =
    process.env
      .INJECTIVE_NOWNODES_ENABLED
      ?.trim()
      .toLowerCase() ===
    "true";

  const nownodesKey =
    process.env
      .INJECTIVE_NOWNODES_API_KEY
      ?.trim() ||
    process.env
      .NOWNODES_API_KEY
      ?.trim() ||
    null;

  const providers:
    InjectiveIndexedProvider[] = [
      {
        transport:
          "rest",

        id:
          "injective-official-explorer",

        baseUrl:
          official,

        apiKey:
          null,
      },
    ];

  /*
   * Independent indexed-history fallback.
   * The credentials are configured only on the server.
   */
  if (
    quickNodeEndpoint &&
    quickNodeToken
  ) {
    providers.push({
      transport:
        "quicknode-grpc",

      id:
        "injective-quicknode-indexer",

      grpcEndpoint:
        quickNodeEndpoint,

      token:
        quickNodeToken,
    });
  }

  /*
   * NOWNodes remains available as an explicitly
   * enabled tertiary adapter only. A valid API key
   * alone does not imply Injective Indexer entitlement.
   */
  if (
    nownodesEnabled &&
    nownodesKey
  ) {
    providers.push({
      transport:
        "rest",

      id:
        "injective-nownodes-explorer",

      baseUrl:
        process.env
          .INJECTIVE_NOWNODES_URL
          ?.trim() ||
        DEFAULT_NOWNODES_EXPLORER,

      apiKey:
        nownodesKey,
    });
  }

  return providers;
}

export async function getInjectiveIndexedHistory(
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
    InjectiveIndexedHistoryDependencies =
      {}
): Promise<
  InjectiveIndexedHistoryResult
> {
  const started =
    Date.now();

  const normalized =
    normalizeInjectiveAddress(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "injective-indexed-history",

      latencyMs:
        0,

      providerRequestsUsed:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Injective mainnet account address.",
    };
  }

  const policy =
    getCosmosSdkPolicy(
      analysisPlan
    );

  const fetchImpl =
    deps.fetchImpl ??
    fetch;

  const timeoutMs =
    deps.timeoutMs ??
    12_000;

  const providers =
    deps.providers ??
    defaultProviders();

  let requestsUsed =
    0;

  let last:
    InjectiveIndexedHistoryResult =
      {
        ok:
          false,

        providerId:
          "injective-indexed-history",

        latencyMs:
          null,

        providerRequestsUsed:
          0,

        code:
          "UPSTREAM_ERROR",

        error:
          "Injective indexed history is unavailable.",
      };

  for (
    let index = 0;
    index <
      providers.length;
    index += 1
  ) {
    const provider =
      providers[index];

    if (!provider) {
      continue;
    }

    requestsUsed +=
      1;

    let raw:
      unknown;

    if (
      provider.transport ===
        "quicknode-grpc"
    ) {
      const quickNodeLoad =
        deps.quickNodeLoad ??
        (
          async input => {
            const {
              getInjectiveQuickNodeRawHistory,
            } =
              await import(
                "./quicknode"
              );

            return getInjectiveQuickNodeRawHistory(
              input
            );
          }
        );

      const result =
        await quickNodeLoad({
          grpcEndpoint:
            provider
              .grpcEndpoint,

          token:
            provider.token,

          address:
            normalized,

          limit:
            policy
              .transactionLimit,

          timeoutMs,
        });

      if (!result.ok) {
        last = {
          ok:
            false,

          providerId:
            provider.id,

          latencyMs:
            Date.now() -
            started,

          providerRequestsUsed:
            requestsUsed,

          code:
            result.code,

          error:
            result.error,
        };

        continue;
      }

      raw =
        result.data;
    } else {
      const base =
        provider
          .baseUrl
          .replace(
            /\/+$/,
            ""
          );

      if (!base) {
        continue;
      }

      const params =
        new URLSearchParams();

      params.set(
        "limit",
        String(
          policy
            .transactionLimit
        )
      );

      params.set(
        "skip",
        "0"
      );

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          timeoutMs
        );

      try {
        const headers =
          new Headers({
            Accept:
              "application/json",

            "User-Agent":
              "AYZO/1.0 (+https://ayzo.io)",
          });

        if (
          provider.apiKey
        ) {
          headers.set(
            "api-key",
            provider.apiKey
          );
        }

        const response =
          await fetchImpl(
            `${base}/api/explorer/v1/accountTxs/${encodeURIComponent(normalized)}?${params.toString()}`,
            {
              method:
                "GET",

              headers,

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          last = {
            ok:
              false,

            providerId:
              provider.id,

            latencyMs:
              Date.now() -
              started,

            providerRequestsUsed:
              requestsUsed,

            code:
              providerErrorCode(
                response.status
              ),

            error:
              `${provider.id} HTTP ${response.status}.`,
          };

          continue;
        }

        raw =
          await response.json();
      } catch (
        error
      ) {
        last = {
          ok:
            false,

          providerId:
            provider.id,

          latencyMs:
            Date.now() -
            started,

          providerRequestsUsed:
            requestsUsed,

          code:
            error instanceof
                Error &&
              error.name ===
                "AbortError"
              ? "TIMEOUT"
              : "UPSTREAM_ERROR",

          error:
            error instanceof
                Error &&
              error.name ===
                "AbortError"
              ? `${provider.id} timed out.`
              : `${provider.id} request failed.`,
        };

        continue;
      } finally {
        clearTimeout(
          timer
        );
      }
    }

    const root =
      record(
        raw
      );

    if (
      !root ||
      !Array.isArray(
        root.data
      )
    ) {
      last = {
        ok:
          false,

        providerId:
          provider.id,

        latencyMs:
          Date.now() -
          started,

        providerRequestsUsed:
          requestsUsed,

        code:
          "MALFORMED_RESPONSE",

        error:
          `${provider.id} returned malformed transaction history.`,
      };

      continue;
    }

    const transactions =
      root.data
        .map(
          parseTransaction
        )
        .filter(
          (
            item
          ): item is CosmosSdkTransactionEvidence =>
            item !== null
        )
        .slice(
          0,
          policy
            .transactionLimit
        );

    if (
      root.data.length >
        0 &&
      transactions.length ===
        0
    ) {
      last = {
        ok:
          false,

        providerId:
          provider.id,

        latencyMs:
          Date.now() -
          started,

        providerRequestsUsed:
          requestsUsed,

        code:
          "MALFORMED_RESPONSE",

        error:
          `${provider.id} returned unparseable transaction evidence.`,
      };

      continue;
    }

    const paging =
      record(
        root.paging
      );

    const total =
      integer(
        paging?.total
      );

    const nextTokens =
      array(
        paging?.next
      )
        .map(
          text
        )
        .filter(
          (
            item
          ): item is string =>
            item !== null
        );

    const nextFieldKnown =
      paging !==
        null &&
      Object.prototype
        .hasOwnProperty
        .call(
          paging,
          "next"
        );

    return {
      ok:
        true,

      providerId:
        provider.id,

      latencyMs:
        Date.now() -
        started,

      data: {
        transactions,

        coverage: {
          transactionLimit:
            policy
              .transactionLimit,

          providerRequestsUsed:
            requestsUsed,

          transportFailoverUsed:
            index > 0,

          historyHasMore:
            total !==
              null
              ? total >
                transactions.length
              : nextFieldKnown
                ? nextTokens
                    .length >
                  0
                : transactions
                    .length >=
                  policy
                    .transactionLimit,

          total,
        },
      },
    };
  }

  return {
    ...last,

    providerRequestsUsed:
      requestsUsed,
  };
}
