import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeTonAddress,
} from "./address";

import {
  getTonAnalysisPolicy,
} from "./policy";

import type {
  TonAccountEvidence,
  TonEvidence,
  TonJettonTransferEvidence,
  TonJettonWalletEvidence,
  TonMessageEvidence,
  TonProviderResult,
  TonTransactionEvidence,
} from "./types";

const DEFAULT_BASE_URL =
  "https://toncenter.com/api/v3";

type JsonRecord =
  Record<
    string,
    unknown
  >;

export type TonFetch =
  (
    input:
      string,
    init?:
      RequestInit
  ) =>
    Promise<{
      ok:
        boolean;

      status:
        number;

      json():
        Promise<unknown>;
    }>;

export type TonProviderDependencies = {
  fetchImpl:
    TonFetch;

  baseUrl:
    string;

  apiKey:
    string | null;

  timeoutMs:
    number;

  unauthenticatedDelayMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  TonProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .TONCENTER_V3_URL
        ?.trim() ||
      DEFAULT_BASE_URL,

    apiKey:
      process.env
        .TONCENTER_API_KEY
        ?.trim() ||
      null,

    timeoutMs:
      12_000,

    unauthenticatedDelayMs:
      1_050,
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

function numberValue(
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

function booleanValue(
  value:
    unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function integerString(
  value:
    unknown,
  fallback =
    "0"
) {
  if (
    typeof value ===
      "string" &&
    /^-?\d+$/.test(
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
    )
  ) {
    return String(
      value
    );
  }

  return fallback;
}

function timestamp(
  value:
    unknown
) {
  const seconds =
    numberValue(
      value
    );

  if (
    seconds ===
      null ||
    seconds <
      0
  ) {
    return null;
  }

  return new Date(
    seconds *
      1000
  ).toISOString();
}

function parseMessage(
  value:
    unknown
): TonMessageEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    source:
      text(
        row.source
      ),

    destination:
      text(
        row.destination
      ),

    valueNano:
      integerString(
        row.value
      ),

    hash:
      text(
        row.hash
      ),

    opcode:
      numberValue(
        row.opcode
      ),

    bounced:
      booleanValue(
        row.bounced
      ),
  };
}

function parseTransaction(
  value:
    unknown
): TonTransactionEvidence | null {
  const row =
    record(
      value
    );

  const hash =
    text(
      row?.hash
    );

  if (!hash) {
    return null;
  }

  const description =
    record(
      row?.description
    );

  return {
    transactionHash:
      hash,

    logicalTime:
      text(
        row?.lt
      ),

    timestamp:
      timestamp(
        row?.now
      ),

    totalFeesNano:
      integerString(
        row?.total_fees
      ),

    aborted:
      booleanValue(
        description
          ?.aborted
      ),

    endStatus:
      text(
        row?.end_status
      ),

    inbound:
      parseMessage(
        row?.in_msg
      ),

    outbound:
      array(
        row?.out_msgs
      )
        .map(
          parseMessage
        )
        .filter(
          (
            item
          ): item is
            TonMessageEvidence =>
              item !== null
        ),
  };
}

function metadataFor(
  metadata:
    JsonRecord | null,
  address:
    string
) {
  const item =
    record(
      metadata?.[
        address
      ]
    );

  const tokenInfo =
    array(
      item?.token_info
    )
      .map(
        record
      )
      .filter(
        (
          value
        ): value is
          JsonRecord =>
            value !== null
      );

  const preferred =
    tokenInfo.find(
      value =>
        text(
          value.type
        ) ===
          "jetton_master"
    ) ??
    tokenInfo[0] ??
    null;

  return {
    name:
      text(
        preferred?.name
      ),

    symbol:
      text(
        preferred?.symbol
      ),

    valid:
      booleanValue(
        preferred?.valid
      ),

    scam:
      booleanValue(
        preferred?.is_scam
      ),
  };
}

function parseJettonWallets(
  body:
    JsonRecord | null
): TonJettonWalletEvidence[] {
  const metadata =
    record(
      body?.metadata
    );

  return array(
    body
      ?.jetton_wallets
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const address =
          text(
            row.address
          );

        const jetton =
          text(
            row.jetton
          );

        if (
          !address ||
          !jetton
        ) {
          return [];
        }

        const info =
          metadataFor(
            metadata,
            jetton
          );

        return [
          {
            walletAddress:
              address,

            owner:
              text(
                row.owner
              ),

            jettonMaster:
              jetton,

            balance:
              integerString(
                row.balance
              ),

            lastTransactionLt:
              text(
                row
                  .last_transaction_lt
              ),

            name:
              info.name,

            symbol:
              info.symbol,

            validMetadata:
              info.valid,

            scamMetadata:
              info.scam,
          },
        ];
      }
    );
}

function parseJettonTransfers(
  body:
    JsonRecord | null
): TonJettonTransferEvidence[] {
  return array(
    body
      ?.jetton_transfers
  )
    .map(
      record
    )
    .filter(
      (
        row
      ): row is
        JsonRecord =>
          row !== null
    )
    .flatMap(
      row => {
        const hash =
          text(
            row
              .transaction_hash
          );

        const master =
          text(
            row
              .jetton_master
          );

        if (
          !hash ||
          !master
        ) {
          return [];
        }

        return [
          {
            transactionHash:
              hash,

            transactionLt:
              text(
                row
                  .transaction_lt
              ),

            timestamp:
              timestamp(
                row
                  .transaction_now
              ),

            amount:
              integerString(
                row.amount
              ),

            jettonMaster:
              master,

            source:
              text(
                row.source
              ),

            sourceWallet:
              text(
                row
                  .source_wallet
              ),

            destination:
              text(
                row.destination
              ),

            aborted:
              booleanValue(
                row
                  .transaction_aborted
              ),
          },
        ];
      }
    );
}

async function sleep(
  milliseconds:
    number
) {
  if (
    milliseconds <=
    0
  ) {
    return;
  }

  await new Promise<void>(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

function codeForError(
  error:
    unknown
) {
  if (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  ) {
    return "TIMEOUT" as const;
  }

  if (
    error instanceof
      Error &&
    error.name ===
      "AbortError"
  ) {
    return "TIMEOUT" as const;
  }

  return "UPSTREAM_ERROR" as const;
}

export async function getTonEvidence(
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
    TonProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  TonProviderResult
> {
  const normalized =
    normalizeTonAddress(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "toncenter-v3",

      latencyMs:
        null,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid TON mainnet address.",
    };
  }

  const policy =
    getTonAnalysisPolicy(
      analysisPlan
    );

  const started =
    Date.now();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      deps.timeoutMs
    );

  const headers:
    Record<
      string,
      string
    > = {
    Accept:
      "application/json",
  };

  if (
    deps.apiKey
  ) {
    headers[
      "X-API-Key"
    ] =
      deps.apiKey;
  }

  let requestCount =
    0;

  async function request(
    path:
      string,
    params:
      Record<
        string,
        string
      >
  ) {
    if (
      requestCount >
        0 &&
      !deps.apiKey
    ) {
      await sleep(
        deps
          .unauthenticatedDelayMs
      );
    }

    requestCount +=
      1;

    const url =
      new URL(
        deps.baseUrl +
          path
      );

    for (
      const [
        key,
        value,
      ] of
      Object.entries(
        params
      )
    ) {
      url
        .searchParams
        .set(
          key,
          value
        );
    }

    const response =
      await deps.fetchImpl(
        url.toString(),
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

    if (
      response.status ===
        429
    ) {
      throw Object.assign(
        new Error(
          "RATE_LIMITED"
        ),
        {
          code:
            "RATE_LIMITED",
        }
      );
    }

    if (!response.ok) {
      throw new Error(
        `TON Center HTTP ${response.status}`
      );
    }

    return record(
      await response.json()
    );
  }

  try {
    const accountBody =
      await request(
        "/accountStates",
        {
          address:
            normalized,

          include_boc:
            "false",
        }
      );

    const accountRow =
      array(
        accountBody
          ?.accounts
      )
        .map(
          record
        )
        .find(
          (
            value
          ): value is
            JsonRecord =>
              value !== null
        ) ??
      null;

    const account:
      TonAccountEvidence = {
        address:
          text(
            accountRow
              ?.address
          ) ??
          normalized,

        status:
          text(
            accountRow
              ?.status
          ),

        balanceNano:
          integerString(
            accountRow
              ?.balance
          ),

        codeHash:
          text(
            accountRow
              ?.code_hash
          ),

        interfaces:
          array(
            accountRow
              ?.interfaces
          )
            .filter(
              (
                item
              ): item is
                string =>
                  typeof item ===
                  "string"
            ),

        suspended:
          booleanValue(
            accountRow
              ?.suspended
          ),

        lastTransactionHash:
          text(
            accountRow
              ?.last_transaction_hash
          ),

        lastTransactionLt:
          text(
            accountRow
              ?.last_transaction_lt
          ),
      };

    const recentBody =
      await request(
        "/transactions",
        {
          account:
            normalized,

          limit:
            String(
              policy
                .historyLimit
            ),

          offset:
            "0",

          sort:
            "desc",
        }
      );

    const transactions =
      array(
        recentBody
          ?.transactions
      )
        .map(
          parseTransaction
        )
        .filter(
          (
            item
          ): item is
            TonTransactionEvidence =>
              item !== null
        );

    const earliestBody =
      await request(
        "/transactions",
        {
          account:
            normalized,

          limit:
            String(
              policy
                .earliestHistoryLimit
            ),

          offset:
            "0",

          sort:
            "asc",
        }
      );

    const earliestTransactions =
      array(
        earliestBody
          ?.transactions
      )
        .map(
          parseTransaction
        )
        .filter(
          (
            item
          ): item is
            TonTransactionEvidence =>
              item !== null
        );

    const jettonWalletBody =
      await request(
        "/jetton/wallets",
        {
          owner_address:
            normalized,

          exclude_zero_balance:
            "true",

          limit:
            String(
              policy
                .jettonWalletLimit
            ),

          offset:
            "0",

          sort:
            "desc",
        }
      );

    const jettonTransferBody =
      await request(
        "/jetton/transfers",
        {
          owner_address:
            normalized,

          limit:
            String(
              policy
                .jettonTransferLimit
            ),

          offset:
            "0",

          sort:
            "desc",
        }
      );

    const data:
      TonEvidence = {
        account,

        transactions,

        earliestTransactions,

        jettonWallets:
          parseJettonWallets(
            jettonWalletBody
          ),

        jettonTransfers:
          parseJettonTransfers(
            jettonTransferBody
          ),

        coverage: {
          plan:
            analysisPlan,

          historyLimit:
            policy
              .historyLimit,

          earliestHistoryLimit:
            policy
              .earliestHistoryLimit,

          jettonWalletLimit:
            policy
              .jettonWalletLimit,

          jettonTransferLimit:
            policy
              .jettonTransferLimit,

          provider:
            "toncenter-v3",
        },
      };

    return {
      ok:
        true,

      providerId:
        "toncenter-v3",

      latencyMs:
        Date.now() -
        started,

      data,
    };
  } catch (
    error
  ) {
    const customCode =
      (
        typeof error ===
          "object" &&
        error !== null &&
        "code" in
          error
      )
        ? (
            error as {
              code?:
                unknown;
            }
          ).code
        : null;

    const code =
      customCode ===
        "RATE_LIMITED"
        ? "RATE_LIMITED" as const
        : codeForError(
            error
          );

    return {
      ok:
        false,

      providerId:
        "toncenter-v3",

      latencyMs:
        Date.now() -
        started,

      code,

      error:
        code ===
          "RATE_LIMITED"
          ? "TON Center rate limit reached."
          : code ===
              "TIMEOUT"
            ? "TON Center request timed out."
            : "TON Center request failed.",
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export const TONCENTER_V3_MAINNET =
  DEFAULT_BASE_URL;
