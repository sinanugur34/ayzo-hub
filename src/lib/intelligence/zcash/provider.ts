import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  getZcashAddressKind,
  normalizeZcashTransparentAddress,
} from "./address";

import {
  getZcashAnalysisPolicy,
} from "./policy";

import type {
  ZcashCanonicalTransaction,
  ZcashEvidence,
  ZcashProviderErrorCode,
  ZcashProviderResult,
  ZcashTransparentInput,
  ZcashTransparentOutput,
  ZcashTransparentTransaction,
  ZcashTransparentUtxo,
} from "./types";

const DEFAULT_BLOCKCHAIR_URL =
  "https://api.blockchair.com/zcash";

const TX_HASH =
  /^[0-9a-fA-F]{64}$/;

type JsonRecord =
  Record<string, unknown>;

export type ZcashFetch =
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

export type ZcashProviderDependencies = {
  fetchImpl:
    ZcashFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  ZcashProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .ZCASH_BLOCKCHAIR_URL
        ?.trim() ||
      DEFAULT_BLOCKCHAIR_URL,

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
    /^-?\d+$/.test(
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

function nonNegativeInteger(
  value:
    unknown
) {
  const parsed =
    safeInteger(
      value
    );

  return (
    parsed !== null &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function numericString(
  value:
    unknown
): string | null {
  if (
    typeof value ===
      "string" &&
    /^\d+$/.test(
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

function txHash(
  value:
    unknown
): string | null {
  const raw =
    text(
      value
    );

  if (!raw) {
    return null;
  }

  const normalized =
    raw
      .trim()
      .toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : null;
}

function transparentAddress(
  value:
    unknown
): string | null {
  const raw =
    text(
      value
    );

  return raw
    ? normalizeZcashTransparentAddress(
        raw
      )
    : null;
}

function mapStatus(
  status:
    number
): ZcashProviderErrorCode {
  if (
    status === 404
  ) {
    return "NOT_FOUND";
  }

  if (
    status === 402 ||
    status === 429
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

async function requestJson(
  url:
    string,
  deps:
    ZcashProviderDependencies
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
        ZcashProviderErrorCode;

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
      await providerUsageFetch({ provider: "blockchair", operation: "zcash.blockchair" }, url, () => deps.fetchImpl(
        url,
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
      return {
        ok:
          false,

        code:
          mapStatus(
            response.status
          ),

        error:
          `Blockchair Zcash HTTP ${response.status}.`,
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
          "Blockchair Zcash returned invalid JSON.",
      };
    }

    const data =
      record(
        raw
      );

    if (!data) {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "Blockchair Zcash response was malformed.",
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
          "Blockchair Zcash request timed out.",
      };
    }

    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Blockchair Zcash request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

function parseUtxo(
  value:
    unknown
): ZcashTransparentUtxo | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const hash =
    txHash(
      row[
        "transaction_hash"
      ]
    );

  const index =
    nonNegativeInteger(
      row.index
    );

  const amount =
    numericString(
      row.value
    );

  if (
    !hash ||
    index === null ||
    amount === null
  ) {
    return null;
  }

  const height =
    safeInteger(
      row[
        "block_id"
      ]
    );

  return {
    txid:
      hash,

    height:
      height !== null &&
      height >= 0
        ? height
        : null,

    outputIndex:
      index,

    zatoshis:
      amount,
  };
}

function parseInput(
  value:
    unknown
): ZcashTransparentInput | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    previousTransactionHash:
      txHash(
        row[
          "transaction_hash"
        ]
      ),

    previousOutputIndex:
      nonNegativeInteger(
        row.index
      ),

    address:
      transparentAddress(
        row.recipient
      ),

    valueZatoshis:
      numericString(
        row.value
      ),
  };
}

function parseOutput(
  value:
    unknown
): ZcashTransparentOutput | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    index:
      nonNegativeInteger(
        row.index
      ),

    address:
      transparentAddress(
        row.recipient
      ),

    valueZatoshis:
      numericString(
        row.value
      ),
  };
}

function parseCanonical(
  payload:
    JsonRecord,
  requestedHash:
    string
): ZcashCanonicalTransaction | null {
  const data =
    record(
      payload.data
    );

  const item =
    record(
      data?.[
        requestedHash
      ]
    );

  const transaction =
    record(
      item?.transaction
    );

  if (
    !item ||
    !transaction
  ) {
    return null;
  }

  const returnedHash =
    txHash(
      transaction.hash
    );

  if (
    returnedHash !==
      requestedHash
  ) {
    return null;
  }

  const rawInputs =
    array(
      item.inputs
    );

  const rawOutputs =
    array(
      item.outputs
    );

  const inputs =
    rawInputs
      .map(
        parseInput
      )
      .filter(
        (
          entry
        ): entry is ZcashTransparentInput =>
          entry !== null
      );

  const outputs =
    rawOutputs
      .map(
        parseOutput
      )
      .filter(
        (
          entry
        ): entry is ZcashTransparentOutput =>
          entry !== null
      );

  if (
    inputs.length !==
      rawInputs.length ||
    outputs.length !==
      rawOutputs.length
  ) {
    return null;
  }

  const blockHeight =
    safeInteger(
      transaction[
        "block_id"
      ]
    );

  return {
    txid:
      returnedHash,

    height:
      blockHeight !==
        null &&
      blockHeight >= 0
        ? blockHeight
        : null,

    timestamp:
      text(
        transaction.time
      ),

    coinbase:
      bool(
        transaction[
          "is_coinbase"
        ]
      ),

    inputs,

    outputs,
  };
}

export async function getZcashBlockchairEvidence(
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
    ZcashProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  ZcashProviderResult<
    ZcashEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeZcashTransparentAddress(
      inputAddress
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Zcash transparent mainnet address.",
    };
  }

  const kind =
    getZcashAddressKind(
      normalized
    );

  if (
    kind !==
      "transparent-p2pkh" &&
    kind !==
      "transparent-p2sh"
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Unsupported Zcash address family.",
    };
  }

  const policy =
    getZcashAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const takeRequest =
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

  if (!takeRequest()) {
    throw new Error(
      "Zcash request budget unexpectedly exhausted before address lookup."
    );
  }

  const dashboardUrl =
    new URL(
      `${deps.baseUrl}/dashboards/address/${encodeURIComponent(normalized)}`
    );

  dashboardUrl.searchParams.set(
    "state",
    "latest"
  );

  dashboardUrl.searchParams.set(
    "limit",
    `${policy.historyLimit},${policy.utxoLimit}`
  );

  const dashboard =
    await requestJson(
      dashboardUrl.toString(),
      deps
    );

  if (!dashboard.ok) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        Date.now() -
        started,

      code:
        dashboard.code,

      error:
        dashboard.error,
    };
  }

  const data =
    record(
      dashboard
        .data
        .data
    );

  const addressDashboard =
    record(
      data?.[
        normalized
      ]
    );

  const addressState =
    record(
      addressDashboard
        ?.address
    );

  if (
    !addressDashboard ||
    !addressState
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Blockchair Zcash address response did not contain address evidence.",
    };
  }

  const rawHashes =
    array(
      addressDashboard
        .transactions
    );

  const hashes =
    rawHashes
      .map(
        txHash
      );

  if (
    hashes.some(
      hash =>
        hash === null
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Blockchair Zcash address history contained an invalid transaction hash.",
    };
  }

  const transactions:
    ZcashTransparentTransaction[] =
      (
        hashes as string[]
      ).map(
        hash => ({
          txid:
            hash,

          height:
            null,

          timestamp:
            null,
        })
      );

  const rawUtxos =
    array(
      addressDashboard
        .utxo
    );

  const parsedUtxos =
    rawUtxos
      .map(
        parseUtxo
      );

  if (
    parsedUtxos.some(
      item =>
        item === null
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-blockchair",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Blockchair Zcash UTXO evidence was malformed.",
    };
  }

  const utxos =
    parsedUtxos as
      ZcashTransparentUtxo[];

  const transactionCount =
    nonNegativeInteger(
      addressState[
        "transaction_count"
      ]
    );

  const unspentOutputCount =
    nonNegativeInteger(
      addressState[
        "unspent_output_count"
      ]
    );

  const historyHasMore =
    transactionCount !==
      null
      ? transactionCount >
        transactions.length
      : transactions.length >=
        policy.historyLimit;

  const utxosHaveMore =
    unspentOutputCount !==
      null
      ? unspentOutputCount >
        utxos.length
      : utxos.length >=
        policy.utxoLimit;

  const canonicalTargets =
    transactions.slice(
      0,
      policy
        .canonicalSampleLimit
    );

  const canonicalTransactions:
    ZcashCanonicalTransaction[] =
      [];

  let canonicalUnavailable =
    0;

  for (
    const transaction of
    canonicalTargets
  ) {
    if (!takeRequest()) {
      canonicalUnavailable +=
        1;

      continue;
    }

    const canonicalUrl =
      `${deps.baseUrl}/dashboards/transaction/${encodeURIComponent(transaction.txid)}`;

    const canonical =
      await requestJson(
        canonicalUrl,
        deps
      );

    if (!canonical.ok) {
      canonicalUnavailable +=
        1;

      continue;
    }

    const parsed =
      parseCanonical(
        canonical.data,
        transaction.txid
      );

    if (!parsed) {
      canonicalUnavailable +=
        1;

      continue;
    }

    canonicalTransactions.push(
      parsed
    );
  }

  return {
    ok:
      true,

    providerId:
      "zcash-blockchair",

    latencyMs:
      Date.now() -
      started,

    data: {
      network:
        "zcash",

      address:
        normalized,

      addressKind:
        kind,

      analysisPlan,

      balanceZatoshis:
        numericString(
          addressState.balance
        ),

      totalReceivedZatoshis:
        numericString(
          addressState.received
        ),

      totalSpentZatoshis:
        numericString(
          addressState.spent
        ),

      transactions,

      utxos,

      canonicalTransactions,

      coverage: {
        plan:
          analysisPlan,

        historyLimit:
          policy
            .historyLimit,

        canonicalSampleLimit:
          policy
            .canonicalSampleLimit,

        utxoLimit:
          policy
            .utxoLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        historyHasMore,

        utxosHaveMore,

        canonicalRequested:
          canonicalTargets
            .length,

        canonicalVerified:
          canonicalTransactions
            .length,

        canonicalUnavailable,
      },
    },
  };
}
