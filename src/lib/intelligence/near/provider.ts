import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  classifyNearAccountId,
  normalizeNearAccountId,
} from "./address";

import {
  getNearAnalysisPolicy,
} from "./policy";

import type {
  NearAccessKeyEvidence,
  NearAccessKeyPermission,
  NearProviderResult,
  NearRpcEvidence,
} from "./types";

const DEFAULT_NEAR_RPC =
  "https://rpc.mainnet.near.org";

type JsonRecord =
  Record<string, unknown>;

export type NearFetch =
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

export type NearProviderDependencies = {
  fetchImpl:
    NearFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  NearProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .NEAR_MAINNET_RPC_URL
        ?.trim() ||
      DEFAULT_NEAR_RPC,

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

function text(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function finiteNumber(
  value:
    unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function stringArray(
  value:
    unknown
) {
  return Array.isArray(
    value
  )
    ? value.filter(
        (
          item
        ): item is string =>
          typeof item ===
            "string"
      )
    : [];
}

function parsePermission(
  value:
    unknown
): NearAccessKeyPermission {
  if (
    value === "FullAccess"
  ) {
    return {
      type:
        "full-access",
    };
  }

  const row =
    record(
      value
    );

  const functionCall =
    record(
      row?.FunctionCall
    );

  if (functionCall) {
    return {
      type:
        "function-call",

      allowanceYoctoNear:
        text(
          functionCall
            .allowance
        ),

      receiverId:
        text(
          functionCall
            .receiver_id
        ),

      methodNames:
        stringArray(
          functionCall
            .method_names
        ),
    };
  }

  return {
    type:
      "unknown",
  };
}

function parseAccessKey(
  value:
    unknown
): NearAccessKeyEvidence | null {
  const row =
    record(
      value
    );

  const publicKey =
    text(
      row?.public_key
    );

  const accessKey =
    record(
      row?.access_key
    );

  if (
    !publicKey ||
    !accessKey
  ) {
    return null;
  }

  return {
    publicKey,

    nonce:
      finiteNumber(
        accessKey.nonce
      ),

    permission:
      parsePermission(
        accessKey.permission
      ),
  };
}

function rpcErrorIsNotFound(
  error:
    unknown
) {
  let serialized =
    "";

  try {
    serialized =
      JSON.stringify(
        error
      ).toUpperCase();
  } catch {
    serialized =
      "";
  }

  return (
    serialized.includes(
      "UNKNOWN_ACCOUNT"
    ) ||
    serialized.includes(
      "DOES NOT EXIST"
    )
  );
}

async function rpcRequest(
  {
    method,
    params,
  }: {
    method:
      string;

    params:
      JsonRecord;
  },
  deps:
    NearProviderDependencies
): Promise<
  | {
      ok:
        true;

      result:
        JsonRecord;
    }
  | {
      ok:
        false;

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
        deps.baseUrl,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                "ayzo",

              method,

              params,
            }),

          signal:
            controller.signal,
        }
      );

    if (
      !response.ok
    ) {
      return {
        ok:
          false,

        code:
          response.status ===
            429
            ? "RATE_LIMITED"
            : "UPSTREAM_ERROR",

        error:
          `NEAR RPC HTTP ${response.status}.`,
      };
    }

    let body:
      unknown;

    try {
      body =
        await response.json();
    } catch {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "NEAR RPC returned invalid JSON.",
      };
    }

    const envelope =
      record(
        body
      );

    if (!envelope) {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "NEAR RPC returned an invalid envelope.",
      };
    }

    if (
      envelope.error !==
        undefined
    ) {
      return {
        ok:
          false,

        code:
          rpcErrorIsNotFound(
            envelope.error
          )
            ? "NOT_FOUND"
            : "UPSTREAM_ERROR",

        error:
          "NEAR RPC returned an execution error.",
      };
    }

    const result =
      record(
        envelope.result
      );

    if (!result) {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "NEAR RPC result was malformed.",
      };
    }

    return {
      ok:
        true,
      result,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      return {
        ok:
          false,

        code:
          "TIMEOUT",

        error:
          "NEAR RPC request timed out.",
      };
    }

    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "NEAR RPC request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

export async function getNearRpcEvidence(
  {
    accountId,
    analysisPlan,
  }: {
    accountId:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    NearProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  NearProviderResult<
    NearRpcEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeNearAccountId(
      accountId
    );

  const accountKind =
    normalized
      ? classifyNearAccountId(
          normalized
        )
      : null;

  if (
    !normalized ||
    !accountKind
  ) {
    return {
      ok:
        false,

      providerId:
        "near-rpc",

      latencyMs:
        0,

      code:
        "INVALID_ACCOUNT",

      error:
        "Invalid NEAR account ID.",
    };
  }

  const policy =
    getNearAnalysisPolicy(
      analysisPlan
    );

  const accountResult =
    await rpcRequest(
      {
        method:
          "query",

        params: {
          request_type:
            "view_account",

          finality:
            "final",

          account_id:
            normalized,
        },
      },
      deps
    );

  if (
    !accountResult.ok
  ) {
    return {
      ok:
        false,

      providerId:
        "near-rpc",

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
    accountResult.result;

  const amount =
    text(
      account.amount
    );

  const locked =
    text(
      account.locked
    );

  if (
    amount === null ||
    locked === null
  ) {
    return {
      ok:
        false,

      providerId:
        "near-rpc",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "NEAR account state was malformed.",
    };
  }

  const accessResult =
    await rpcRequest(
      {
        method:
          "query",

        params: {
          request_type:
            "view_access_key_list",

          finality:
            "final",

          account_id:
            normalized,
        },
      },
      deps
    );

  const unavailableEvidence:
    string[] = [
      "indexed_transaction_history",
      "receipt_history",
      "fungible_token_history",
    ];

  let accessKeys:
    NearAccessKeyEvidence[] =
      [];

  if (
    accessResult.ok
  ) {
    accessKeys =
      (
        Array.isArray(
          accessResult
            .result.keys
        )
          ? accessResult
              .result.keys
          : []
      )
        .map(
          parseAccessKey
        )
        .filter(
          (
            item
          ): item is NearAccessKeyEvidence =>
            item !== null
        )
        .slice(
          0,
          policy
            .accessKeyLimit
        );
  } else {
    unavailableEvidence.push(
      "access_keys"
    );
  }

  return {
    ok:
      true,

    providerId:
      "near-rpc",

    latencyMs:
      Date.now() -
      started,

    data: {
      account: {
        accountId:
          normalized,

        accountKind,

        amountYoctoNear:
          amount,

        lockedYoctoNear:
          locked,

        storageUsage:
          finiteNumber(
            account
              .storage_usage
          ),

        storagePaidAt:
          finiteNumber(
            account
              .storage_paid_at
          ),

        codeHash:
          text(
            account
              .code_hash
          ),

        blockHeight:
          finiteNumber(
            account
              .block_height
          ),

        blockHash:
          text(
            account
              .block_hash
          ),
      },

      accessKeys,

      coverage: {
        plan:
          analysisPlan,

        accessKeyLimit:
          policy
            .accessKeyLimit,

        transactionLimit:
          policy
            .transactionLimit,

        receiptLimit:
          policy
            .receiptLimit,

        fungibleTokenLimit:
          policy
            .fungibleTokenLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          2,

        indexedHistoryAvailable:
          false,

        coverage:
          "partial",

        unavailableEvidence,
      },
    },
  };
}
