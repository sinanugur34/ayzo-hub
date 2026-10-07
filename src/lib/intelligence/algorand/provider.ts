import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeAlgorandAddress,
} from "./address";

import {
  getAlgorandAnalysisPolicy,
} from "./policy";

import type {
  AlgorandApplicationCallEvidence,
  AlgorandApplicationLocalState,
  AlgorandAssetAuthority,
  AlgorandAssetFreezeEvidence,
  AlgorandAssetHolding,
  AlgorandAssetTransferEvidence,
  AlgorandCreatedApplication,
  AlgorandEvidence,
  AlgorandPaymentEvidence,
  AlgorandProviderErrorCode,
  AlgorandProviderResult,
  AlgorandTransactionEvidence,
} from "./types";

const PRIMARY_INDEXER =
  "https://mainnet-idx.4160.nodely.dev";

const BACKUP_INDEXER =
  "https://mainnet-idx.algonode.xyz";

const DISASTER_INDEXER =
  "https://mainnet-idx.algonode.network";

type JsonRecord =
  Record<string, unknown>;

export type AlgorandFetch =
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

export type AlgorandProviderDependencies = {
  fetchImpl:
    AlgorandFetch;

  baseUrls:
    readonly string[];

  timeoutMs:
    number;
};

function unique(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values.filter(
        value =>
          value.trim()
      )
    ),
  ];
}

const CONFIGURED_INDEXER =
  process.env
    .ALGORAND_INDEXER_URL
    ?.trim();

const DEFAULT_DEPENDENCIES:
  AlgorandProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrls:
      unique([
        CONFIGURED_INDEXER ??
          PRIMARY_INDEXER,

        PRIMARY_INDEXER,

        BACKUP_INDEXER,

        DISASTER_INDEXER,
      ]),

    timeoutMs:
      12_000,
  };

function record(
  value:
    unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  )
    ? value as JsonRecord
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

function bool(
  value:
    unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function safeInteger(
  value:
    unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    ) &&
    value >= 0
  )
    ? value
    : null;
}

function numericString(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    /^[0-9]+$/.test(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    ) &&
    value >= 0
  ) {
    return String(
      value
    );
  }

  return null;
}

function address(
  value:
    unknown
): string | null {
  const raw =
    text(
      value
    );

  return raw
    ? normalizeAlgorandAddress(
        raw
      )
    : null;
}

function transactionType(
  value:
    unknown
):
  AlgorandTransactionEvidence[
    "type"
  ] {
  switch (
    text(value)
  ) {
    case "pay":
    case "keyreg":
    case "acfg":
    case "axfer":
    case "afrz":
    case "appl":
    case "stpf":
    case "hb":
      return text(
        value
      ) as AlgorandTransactionEvidence[
        "type"
      ];

    default:
      return "unknown";
  }
}

function parsePayment(
  value:
    unknown
): AlgorandPaymentEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    receiver:
      address(
        row.receiver
      ),

    amountMicroAlgos:
      numericString(
        row.amount
      ),

    closeRemainderTo:
      address(
        row[
          "close-remainder-to"
        ]
      ),
  };
}

function parseAssetTransfer(
  value:
    unknown
): AlgorandAssetTransferEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    assetId:
      safeInteger(
        row[
          "asset-id"
        ]
      ),

    receiver:
      address(
        row.receiver
      ),

    amount:
      numericString(
        row.amount
      ),

    explicitSender:
      address(
        row.sender
      ),

    closeTo:
      address(
        row[
          "close-to"
        ]
      ),
  };
}

function parseAssetFreeze(
  value:
    unknown
): AlgorandAssetFreezeEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    assetId:
      safeInteger(
        row[
          "asset-id"
        ]
      ),

    address:
      address(
        row.address
      ),

    frozen:
      bool(
        row[
          "new-freeze-status"
        ]
      ),
  };
}

function parseApplication(
  value:
    unknown
): AlgorandApplicationCallEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    applicationId:
      safeInteger(
        row[
          "application-id"
        ]
      ),

    onCompletion:
      text(
        row[
          "on-completion"
        ]
      ),

    accounts:
      array(
        row.accounts
      )
        .map(
          address
        )
        .filter(
          (
            item
          ): item is string =>
            item !== null
        ),
  };
}

function parseTransaction(
  value:
    unknown,
  depth =
    0
): AlgorandTransactionEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  if (
    depth > 4
  ) {
    return null;
  }

  const inner =
    array(
      row[
        "inner-txns"
      ]
    )
      .map(
        item =>
          parseTransaction(
            item,
            depth + 1
          )
      )
      .filter(
        (
          item
        ): item is AlgorandTransactionEvidence =>
          item !== null
      );

  return {
    id:
      text(
        row.id
      ),

    confirmedRound:
      safeInteger(
        row[
          "confirmed-round"
        ]
      ),

    roundTime:
      safeInteger(
        row[
          "round-time"
        ]
      ),

    type:
      transactionType(
        row[
          "tx-type"
        ]
      ),

    sender:
      address(
        row.sender
      ),

    rekeyTo:
      address(
        row[
          "rekey-to"
        ]
      ),

    payment:
      parsePayment(
        row[
          "payment-transaction"
        ]
      ),

    assetTransfer:
      parseAssetTransfer(
        row[
          "asset-transfer-transaction"
        ]
      ),

    assetFreeze:
      parseAssetFreeze(
        row[
          "asset-freeze-transaction"
        ]
      ),

    applicationCall:
      parseApplication(
        row[
          "application-transaction"
        ]
      ),

    createdAssetId:
      safeInteger(
        row[
          "created-asset-index"
        ]
      ),

    createdApplicationId:
      safeInteger(
        row[
          "created-application-index"
        ]
      ),

    innerTransactions:
      inner,
  };
}

function parseAssetHolding(
  value:
    unknown
): AlgorandAssetHolding | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const assetId =
    safeInteger(
      row[
        "asset-id"
      ]
    );

  const amount =
    numericString(
      row.amount
    );

  if (
    assetId === null ||
    amount === null
  ) {
    return null;
  }

  return {
    assetId,
    amount,

    frozen:
      bool(
        row[
          "is-frozen"
        ]
      ),
  };
}

function parseAssetAuthority(
  value:
    unknown
): AlgorandAssetAuthority | null {
  const row =
    record(
      value
    );

  const params =
    record(
      row?.params
    );

  const assetId =
    safeInteger(
      row?.index
    );

  if (
    assetId === null ||
    !params
  ) {
    return null;
  }

  return {
    assetId,

    creator:
      address(
        params.creator
      ),

    total:
      numericString(
        params.total
      ),

    decimals:
      safeInteger(
        params.decimals
      ),

    name:
      text(
        params.name
      ),

    unitName:
      text(
        params[
          "unit-name"
        ]
      ),

    manager:
      address(
        params.manager
      ),

    reserve:
      address(
        params.reserve
      ),

    freeze:
      address(
        params.freeze
      ),

    clawback:
      address(
        params.clawback
      ),
  };
}

function parseAppLocal(
  value:
    unknown
): AlgorandApplicationLocalState | null {
  const row =
    record(
      value
    );

  const id =
    safeInteger(
      row?.id
    );

  return id === null
    ? null
    : {
        applicationId:
          id,
      };
}

function parseCreatedApp(
  value:
    unknown
): AlgorandCreatedApplication | null {
  const row =
    record(
      value
    );

  const params =
    record(
      row?.params
    );

  const id =
    safeInteger(
      row?.id
    );

  if (
    id === null
  ) {
    return null;
  }

  return {
    applicationId:
      id,

    creator:
      address(
        params?.creator
      ),
  };
}

function statusCode(
  status:
    number
): AlgorandProviderErrorCode {
  if (
    status === 404
  ) {
    return "NOT_FOUND";
  }

  if (
    status === 403 ||
    status === 429
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

type RequestResult =
  | {
      ok:
        true;

      data:
        JsonRecord;

      baseUrl:
        string;
    }
  | {
      ok:
        false;

      code:
        AlgorandProviderErrorCode;

      error:
        string;
    };

async function requestJson(
  path:
    string,
  deps:
    AlgorandProviderDependencies,
  takeAttempt:
    () => boolean
): Promise<RequestResult> {
  let last:
    RequestResult = {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Algorand Indexer request failed.",
    };

  for (
    const baseUrl of
    deps.baseUrls
  ) {
    if (
      !takeAttempt()
    ) {
      return {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        error:
          "Algorand provider request budget exhausted.",
      };
    }

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
        await providerUsageFetch({ operation: "algorand.http" }, `${baseUrl}${path}`, () => deps.fetchImpl(
          `${baseUrl}${path}`,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",

              "User-Agent":
                "AYZO/1.0 (+https://ayzo.io)",
            },

            cache:
              "no-store",

            signal:
              controller.signal,
          }
        ));

      if (
        !response.ok
      ) {
        const code =
          statusCode(
            response.status
          );

        last = {
          ok:
            false,

          code,

          error:
            `Algorand Indexer HTTP ${response.status}.`,
        };

        /*
         * Account/resource absence is canonical
         * evidence, not a transport failure.
         */
        if (
          code ===
            "NOT_FOUND"
        ) {
          return last;
        }

        continue;
      }

      let raw:
        unknown;

      try {
        raw =
          await response.json();
      } catch {
        last = {
          ok:
            false,

          code:
            "MALFORMED_RESPONSE",

          error:
            "Algorand Indexer returned invalid JSON.",
        };

        continue;
      }

      const data =
        record(
          raw
        );

      if (!data) {
        last = {
          ok:
            false,

          code:
            "MALFORMED_RESPONSE",

          error:
            "Algorand Indexer response was malformed.",
        };

        continue;
      }

      return {
        ok:
          true,

        data,

        baseUrl,
      };
    } catch (
      error
    ) {
      last = {
        ok:
          false,

        code:
          (
            error instanceof
              Error &&
            error.name ===
              "AbortError"
          )
            ? "TIMEOUT"
            : "UPSTREAM_ERROR",

        error:
          (
            error instanceof
              Error &&
            error.name ===
              "AbortError"
          )
            ? "Algorand Indexer request timed out."
            : "Algorand Indexer request failed.",
      };
    } finally {
      clearTimeout(
        timer
      );
    }
  }

  return last;
}

function pagePath(
  path:
    string,
  {
    limit,
    next,
  }: {
    limit:
      number;

    next?:
      string | null;
  }
) {
  const params =
    new URLSearchParams();

  params.set(
    "limit",
    String(
      limit
    )
  );

  if (next) {
    params.set(
      "next",
      next
    );
  }

  return `${path}?${params.toString()}`;
}

export async function getAlgorandNodelyEvidence(
  {
    address: inputAddress,
    analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    AlgorandProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  AlgorandProviderResult<
    AlgorandEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeAlgorandAddress(
      inputAddress
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "algorand-nodely",

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Algorand address.",
    };
  }

  const policy =
    getAlgorandAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const usedBaseUrls =
    new Set<string>();

  const takeAttempt =
    () => {
      if (
        requestsUsed >=
        policy
          .providerRequestBudget
      ) {
        return false;
      }

      requestsUsed +=
        1;

      return true;
    };

  const run =
    async (
      path:
        string
    ) => {
      const result =
        await requestJson(
          path,
          deps,
          takeAttempt
        );

      if (
        result.ok
      ) {
        usedBaseUrls.add(
          result.baseUrl
        );
      }

      return result;
    };

  const encoded =
    encodeURIComponent(
      normalized
    );

  const accountResult =
    await run(
      `/v2/accounts/${encoded}`
    );

  if (
    !accountResult.ok
  ) {
    return {
      ok:
        false,

      providerId:
        "algorand-nodely",

      latencyMs:
        Date.now() -
        started,

      code:
        accountResult.code,

      error:
        accountResult.error,
    };
  }

  const account =
    record(
      accountResult
        .data.account
    );

  const returnedAddress =
    address(
      account?.address
    );

  if (
    !account ||
    returnedAddress !==
      normalized
  ) {
    return {
      ok:
        false,

      providerId:
        "algorand-nodely",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Algorand account response did not match the requested address.",
    };
  }

  const unavailableEvidence:
    string[] = [];

  /*
   * Transaction pagination is intentionally
   * bounded by the selected AYZO plan.
   */
  const transactions:
    AlgorandTransactionEvidence[] =
      [];

  let txNext:
    string | null =
      null;

  let historyHasMore =
    false;

  while (
    transactions.length <
      policy.transactionLimit
  ) {
    const remaining =
      policy.transactionLimit -
      transactions.length;

    const pageLimit =
      Math.min(
        remaining,
        100
      );

    const result =
      await run(
        pagePath(
          `/v2/accounts/${encoded}/transactions`,
          {
            limit:
              pageLimit,

            next:
              txNext,
          }
        )
      );

    if (
      !result.ok
    ) {
      unavailableEvidence.push(
        "transaction_history"
      );

      break;
    }

    const page =
      array(
        result
          .data
          .transactions
      )
        .map(
          item =>
            parseTransaction(
              item
            )
        )
        .filter(
          (
            item
          ): item is AlgorandTransactionEvidence =>
            item !== null
        );

    transactions.push(
      ...page
    );

    const next =
      text(
        result
          .data[
          "next-token"
        ]
      );

    txNext =
      next;

    if (
      !next
    ) {
      break;
    }

    if (
      transactions.length >=
        policy
          .transactionLimit
    ) {
      historyHasMore =
        true;

      break;
    }

    if (
      page.length === 0
    ) {
      historyHasMore =
        true;

      break;
    }
  }

  if (
    txNext &&
    transactions.length >=
      policy.transactionLimit
  ) {
    historyHasMore =
      true;
  }

  async function boundedCollection({
    path,
    limit,
    property,
    parser,
    unavailable,
  }: {
    path:
      string;

    limit:
      number;

    property:
      string;

    parser:
      (
        value:
          unknown
      ) => unknown;

    unavailable:
      string;
  }): Promise<{
    items:
      unknown[];

    hasMore:
      boolean;
  }> {
    const result =
      await run(
        pagePath(
          path,
          {
            limit:
              Math.min(
                limit,
                1000
              ),
          }
        )
      );

    if (
      !result.ok
    ) {
      unavailableEvidence.push(
        unavailable
      );

      return {
        items:
          [],

        hasMore:
          false,
      };
    }

    const parsed =
      array(
        result
          .data[
          property
        ]
      )
        .map(
          parser
        )
        .filter(
          item =>
            item !== null
        )
        .slice(
          0,
          limit
        );

    return {
      items:
        parsed,

      hasMore:
        Boolean(
          text(
            result
              .data[
              "next-token"
            ]
          )
        ),
    };
  }

  const assetResult =
    await boundedCollection({
      path:
        `/v2/accounts/${encoded}/assets`,

      limit:
        policy.assetLimit,

      property:
        "assets",

      parser:
        parseAssetHolding,

      unavailable:
        "asset_holdings",
    });

  const createdAssetResult =
    await boundedCollection({
      path:
        `/v2/accounts/${encoded}/created-assets`,

      limit:
        policy
          .createdAssetLimit,

      property:
        "assets",

      parser:
        parseAssetAuthority,

      unavailable:
        "created_assets",
    });

  const appLocalResult =
    await boundedCollection({
      path:
        `/v2/accounts/${encoded}/apps-local-state`,

      limit:
        policy
          .applicationLimit,

      property:
        "apps-local-states",

      parser:
        parseAppLocal,

      unavailable:
        "application_local_state",
    });

  const createdAppsResult =
    await boundedCollection({
      path:
        `/v2/accounts/${encoded}/created-applications`,

      limit:
        policy
          .applicationLimit,

      property:
        "applications",

      parser:
        parseCreatedApp,

      unavailable:
        "created_applications",
    });

  const assets =
    assetResult
      .items as
      AlgorandAssetHolding[];

  const createdAssets =
    createdAssetResult
      .items as
      AlgorandAssetAuthority[];

  const appLocalStates =
    appLocalResult
      .items as
      AlgorandApplicationLocalState[];

  const createdApplications =
    createdAppsResult
      .items as
      AlgorandCreatedApplication[];

  const partial =
    unavailableEvidence
      .length > 0 ||
    historyHasMore ||
    assetResult.hasMore ||
    createdAssetResult.hasMore ||
    appLocalResult.hasMore ||
    createdAppsResult.hasMore;

  const primary =
    deps.baseUrls[0] ??
    PRIMARY_INDEXER;

  const transportFailoverUsed =
    [...usedBaseUrls]
      .some(
        base =>
          base !==
            primary
      );

  return {
    ok:
      true,

    providerId:
      "algorand-nodely",

    latencyMs:
      Date.now() -
      started,

    data: {
      network:
        "algorand",

      address:
        normalized,

      analysisPlan,

      amountMicroAlgos:
        numericString(
          account.amount
        ),

      minBalanceMicroAlgos:
        numericString(
          account[
            "min-balance"
          ]
        ),

      authAddress:
        address(
          account[
            "auth-addr"
          ]
        ),

      totalAssetsOptedIn:
        safeInteger(
          account[
            "total-assets-opted-in"
          ]
        ),

      totalAppsOptedIn:
        safeInteger(
          account[
            "total-apps-opted-in"
          ]
        ),

      assets,

      createdAssets,

      appLocalStates,

      createdApplications,

      transactions:
        transactions.slice(
          0,
          policy
            .transactionLimit
        ),

      coverage: {
        plan:
          analysisPlan,

        transactionLimit:
          policy
            .transactionLimit,

        assetLimit:
          policy
            .assetLimit,

        createdAssetLimit:
          policy
            .createdAssetLimit,

        applicationLimit:
          policy
            .applicationLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        historyHasMore,

        assetsHaveMore:
          assetResult
            .hasMore,

        createdAssetsHaveMore:
          createdAssetResult
            .hasMore,

        appLocalStateHasMore:
          appLocalResult
            .hasMore,

        createdAppsHaveMore:
          createdAppsResult
            .hasMore,

        transportFailoverUsed,

        unavailableEvidence,

        coverage:
          partial
            ? "partial"
            : "complete",
      },
    },
  };
}
