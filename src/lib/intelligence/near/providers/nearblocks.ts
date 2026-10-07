import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeNearAccountId,
} from "../address";

import {
  getNearAnalysisPolicy,
} from "../policy";

import type {
  NearIndexedEvidence,
  NearIndexedTransaction,
  NearObservedAction,
  NearProviderResult,
  NearReceiptEvidence,
} from "../types";

const DEFAULT_NEARBLOCKS_URL =
  "https://api.nearblocks.io/v1";

type JsonRecord =
  Record<string, unknown>;

export type NearBlocksFetch =
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

export type NearBlocksDependencies = {
  fetchImpl:
    NearBlocksFetch;

  baseUrl:
    string;

  apiKey:
    string | null;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  NearBlocksDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .NEARBLOCKS_BASE_URL
        ?.trim() ||
      DEFAULT_NEARBLOCKS_URL,

    apiKey:
      process.env
        .NEARBLOCKS_API_KEY
        ?.trim() ||
      null,

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

function finiteNumber(
  value:
    unknown
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    /^[0-9]+$/.test(value)
  ) {
    const parsed =
      Number(value);

    return Number.isSafeInteger(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function normalizeTimestamp(
  value:
    unknown
): string | null {
  const raw =
    text(value);

  if (!raw) {
    return null;
  }

  if (
    /^[0-9]+$/.test(
      raw
    )
  ) {
    try {
      const numeric =
        BigInt(raw);

      /*
       * NearBlocks block timestamps are commonly
       * nanoseconds. Keep conversion evidence-safe.
       */
      const milliseconds =
        numeric >
          10_000_000_000_000n
          ? numeric /
            1_000_000n
          : numeric *
            1000n;

      const asNumber =
        Number(
          milliseconds
        );

      if (
        Number.isFinite(
          asNumber
        )
      ) {
        return new Date(
          asNumber
        ).toISOString();
      }
    } catch {
      return null;
    }
  }

  const parsed =
    Date.parse(raw);

  return Number.isFinite(
    parsed
  )
    ? new Date(
        parsed
      ).toISOString()
    : null;
}

function actionType(
  value:
    unknown
): NearObservedAction[
  "type"
] {
  const raw =
    (
      text(value) ??
      ""
    ).toUpperCase();

  switch (raw) {
    case "TRANSFER":
      return "Transfer";

    case "FUNCTION_CALL":
    case "FUNCTIONCALL":
      return "FunctionCall";

    case "CREATE_ACCOUNT":
    case "CREATEACCOUNT":
      return "CreateAccount";

    case "DELETE_ACCOUNT":
    case "DELETEACCOUNT":
      return "DeleteAccount";

    case "ADD_KEY":
    case "ADDKEY":
      return "AddKey";

    case "DELETE_KEY":
    case "DELETEKEY":
      return "DeleteKey";

    case "STAKE":
      return "Stake";

    case "DEPLOY_CONTRACT":
    case "DEPLOYCONTRACT":
      return "DeployContract";

    default:
      return "unknown";
  }
}

function parseAction(
  value:
    unknown,
  context: {
    senderId:
      string | null;

    receiverId:
      string | null;

    transactionHash:
      string | null;

    receiptId:
      string | null;

    blockHeight:
      number | null;

    blockTimestamp:
      string | null;
  }
): NearObservedAction | null {
  const row =
    record(value);

  if (!row) {
    return null;
  }

  const type =
    actionType(
      row.action ??
      row.action_kind ??
      row.type
    );

  const args =
    record(
      row.args
    ) ??
    record(
      row.action_args
    ) ??
    row;

  const methodName =
    text(
      args.method_name
    ) ??
    text(
      row.method_name
    );

  const deposit =
    text(
      args.deposit
    ) ??
    text(
      row.deposit
    );

  const publicKey =
    text(
      args.public_key
    ) ??
    text(
      row.public_key
    );

  return {
    type,

    senderId:
      context.senderId,

    receiverId:
      context.receiverId,

    transactionHash:
      context.transactionHash,

    receiptId:
      context.receiptId,

    blockHeight:
      context.blockHeight,

    blockTimestamp:
      context.blockTimestamp,

    methodName,

    depositYoctoNear:
      deposit,

    publicKey,
  };
}

function parseTransaction(
  value:
    unknown
): NearIndexedTransaction | null {
  const row =
    record(value);

  if (!row) {
    return null;
  }

  const hash =
    text(
      row.transaction_hash
    ) ??
    text(
      row.hash
    );

  if (!hash) {
    return null;
  }

  const signerId =
    text(
      row.signer_account_id
    ) ??
    text(
      row.signer_id
    ) ??
    text(
      row.from
    );

  const receiverId =
    text(
      row.receiver_account_id
    ) ??
    text(
      row.receiver_id
    ) ??
    text(
      row.to
    );

  const blockHeight =
    finiteNumber(
      row.block_height
    );

  const blockTimestamp =
    normalizeTimestamp(
      row.block_timestamp ??
      row.timestamp
    );

  const rawActions =
    array(
      row.actions
    );

  const actions =
    rawActions.length > 0
      ? rawActions
          .map(
            action =>
              parseAction(
                action,
                {
                  senderId:
                    signerId,
                  receiverId,
                  transactionHash:
                    hash,
                  receiptId:
                    null,
                  blockHeight,
                  blockTimestamp,
                }
              )
          )
          .filter(
            (
              item
            ): item is NearObservedAction =>
              item !== null
          )
      : [
          parseAction(
            row,
            {
              senderId:
                signerId,
              receiverId,
              transactionHash:
                hash,
              receiptId:
                null,
              blockHeight,
              blockTimestamp,
            }
          ),
        ].filter(
          (
            item
          ): item is NearObservedAction =>
            item !== null
        );

  return {
    transactionHash:
      hash,

    signerId,

    receiverId,

    blockHeight,

    blockTimestamp,

    actions,
  };
}

function parseReceipt(
  value:
    unknown
): NearReceiptEvidence | null {
  const row =
    record(value);

  if (!row) {
    return null;
  }

  const receiptId =
    text(
      row.receipt_id
    ) ??
    text(
      row.id
    );

  if (!receiptId) {
    return null;
  }

  const predecessorId =
    text(
      row.predecessor_account_id
    ) ??
    text(
      row.predecessor_id
    );

  const receiverId =
    text(
      row.receiver_account_id
    ) ??
    text(
      row.receiver_id
    );

  const transactionHash =
    text(
      row.transaction_hash
    );

  const blockHeight =
    finiteNumber(
      row.block_height
    );

  const blockTimestamp =
    normalizeTimestamp(
      row.block_timestamp ??
      row.timestamp
    );

  const actions =
    array(
      row.actions
    )
      .map(
        action =>
          parseAction(
            action,
            {
              senderId:
                predecessorId,

              receiverId,

              transactionHash,

              receiptId,

              blockHeight,

              blockTimestamp,
            }
          )
      )
      .filter(
        (
          item
        ): item is NearObservedAction =>
          item !== null
      );

  return {
    receiptId,

    predecessorId,

    receiverId,

    transactionHash,

    blockHeight,

    blockTimestamp,

    actions,
  };
}

async function request(
  url:
    string,
  deps:
    NearBlocksDependencies
): Promise<
  | {
      ok:
        true;

      data:
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
    const headers:
      Record<
        string,
        string
      > = {};

    if (
      deps.apiKey
    ) {
      headers.Authorization =
        `Bearer ${deps.apiKey}`;
    }

    const response =
      await providerUsageFetch({ provider: "near-nearblocks", operation: "near.indexed_history" }, url, () => deps.fetchImpl(
        url,
        {
          headers,
          signal:
            controller.signal,
        }
      ));

    if (
      !response.ok
    ) {
      return {
        ok:
          false,

        code:
          response.status ===
            404
            ? "NOT_FOUND"
            : response.status ===
                429
              ? "RATE_LIMITED"
              : "UPSTREAM_ERROR",

        error:
          `NearBlocks HTTP ${response.status}.`,
      };
    }

    let raw:
      unknown;

    try {
      raw =
        await response.json();
    } catch {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "NearBlocks returned invalid JSON.",
      };
    }

    const data =
      record(raw);

    if (!data) {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "NearBlocks response was malformed.",
      };
    }

    return {
      ok:
        true,
      data,
    };
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return {
        ok:
          false,

        code:
          "TIMEOUT",

        error:
          "NearBlocks request timed out.",
      };
    }

    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "NearBlocks request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

export async function getNearIndexedEvidence(
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
    NearBlocksDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  NearProviderResult<
    NearIndexedEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeNearAccountId(
      accountId
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "near-nearblocks",

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

  const encoded =
    encodeURIComponent(
      normalized
    );

  const txUrl =
    new URL(
      `${deps.baseUrl}/txns`
    );

  txUrl.searchParams.set(
    "per_page",
    String(
      policy.transactionLimit
    )
  );

  txUrl.searchParams.set(
    "order",
    "desc"
  );

  /*
   * Query both directions independently because
   * account interaction is directional evidence.
   */
  const outgoingUrl =
    new URL(
      txUrl.toString()
    );

  outgoingUrl
    .searchParams
    .set(
      "from",
      normalized
    );

  const incomingUrl =
    new URL(
      txUrl.toString()
    );

  incomingUrl
    .searchParams
    .set(
      "to",
      normalized
    );

  const receiptUrl =
    new URL(
      `${deps.baseUrl}/account/${encoded}/receipts`
    );

  receiptUrl
    .searchParams
    .set(
      "per_page",
      String(
        policy.receiptLimit
      )
    );

  receiptUrl
    .searchParams
    .set(
      "order",
      "desc"
    );

  const [
    outgoing,
    incoming,
    receipts,
  ] =
    await Promise.all([
      request(
        outgoingUrl.toString(),
        deps
      ),

      request(
        incomingUrl.toString(),
        deps
      ),

      request(
        receiptUrl.toString(),
        deps
      ),
    ]);

  const unavailable:
    string[] = [];

  const transactionMap =
    new Map<
      string,
      NearIndexedTransaction
    >();

  for (
    const result of
    [
      outgoing,
      incoming,
    ]
  ) {
    if (!result.ok) {
      unavailable.push(
        "transaction_history"
      );

      continue;
    }

    const rows =
      array(
        result.data.txns ??
        result.data.transactions
      );

    for (
      const item of rows
        .map(
          parseTransaction
        )
        .filter(
          (
            item
          ): item is NearIndexedTransaction =>
            item !== null
        )
    ) {
      transactionMap.set(
        item.transactionHash,
        item
      );
    }
  }

  let receiptEvidence:
    NearReceiptEvidence[] =
      [];

  if (
    receipts.ok
  ) {
    receiptEvidence =
      array(
        receipts.data.receipts
      )
        .map(
          parseReceipt
        )
        .filter(
          (
            item
          ): item is NearReceiptEvidence =>
            item !== null
        )
        .slice(
          0,
          policy.receiptLimit
        );
  } else {
    unavailable.push(
      "receipt_history"
    );
  }

  const transactions =
    [...transactionMap.values()]
      .sort(
        (
          left,
          right
        ) =>
          (
            right.blockHeight ??
            -1
          ) -
          (
            left.blockHeight ??
            -1
          )
      )
      .slice(
        0,
        policy.transactionLimit
      );

  return {
    ok:
      true,

    providerId:
      "near-nearblocks",

    latencyMs:
      Date.now() -
      started,

    data: {
      transactions,

      receipts:
        receiptEvidence,

      coverage: {
        transactionLimit:
          policy.transactionLimit,

        receiptLimit:
          policy.receiptLimit,

        providerRequestsUsed:
          3,

        historyAvailable:
          outgoing.ok ||
          incoming.ok,

        receiptsAvailable:
          receipts.ok,

        truncated:
          transactionMap.size >
            policy.transactionLimit ||
          receiptEvidence.length >=
            policy.receiptLimit,

        unavailableEvidence:
          [...new Set(
            unavailable
          )],
      },
    },
  };
}
