import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  isXrplClassicAddress,
} from "../address";

import {
  getXrplAnalysisPolicy,
} from "../policy";

import type {
  XrplAccountEvidence,
  XrplAccountObject,
  XrplFundingEvidence,
  XrplIssuedAmount,
  XrplObservedTransaction,
  XrplProviderResult,
  XrplSignerList,
  XrplTrustLine,
} from "../types";

const DEFAULT_XRPL_RPC =
  "https://xrplcluster.com";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function readString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function readNumber(
  value: unknown
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

function readBoolean(
  value: unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function readIssuedAmount(
  value:
    unknown
): XrplIssuedAmount | null {
  if (
    !isRecord(
      value
    )
  ) {
    return null;
  }

  const currency =
    readString(
      value.currency
    );

  const issuer =
    readString(
      value.issuer
    );

  const amount =
    readString(
      value.value
    );

  if (
    !currency ||
    !issuer ||
    amount ===
      null
  ) {
    return null;
  }

  return {
    currency,
    issuer,
    value:
      amount,
  };
}

const TF_PARTIAL_PAYMENT =
  0x00020000;

function isPartialPayment(
  tx:
    Record<string, unknown>
) {
  const flags =
    readNumber(
      tx.Flags
    ) ??
    0;

  return (
    flags &
    TF_PARTIAL_PAYMENT
  ) !==
    0;
}

/*
 * XRP Ledger API v2 renames the Payment
 * transaction instruction field Amount to
 * DeliverMax.
 *
 * More importantly, DeliverMax is not the
 * authoritative received amount for partial
 * payments. For successful Payments, use
 * metadata.delivered_amount whenever available.
 *
 * Fallback to DeliverMax / legacy Amount is
 * permitted only for successful non-partial
 * Payments.
 */
function readPaymentDeliveredAmount(
  tx:
    Record<string, unknown>,

  meta:
    Record<string, unknown>
): unknown | null {
  if (
    readString(
      tx.TransactionType
    ) !==
      "Payment" ||
    readString(
      meta.TransactionResult
    ) !==
      "tesSUCCESS"
  ) {
    return null;
  }

  const delivered =
    meta.delivered_amount;

  if (
    delivered !==
      undefined &&
    delivered !==
      null &&
    delivered !==
      "unavailable"
  ) {
    return delivered;
  }

  /*
   * Some XRPL responses / historical forms may
   * expose DeliveredAmount instead.
   */
  const legacyDelivered =
    meta.DeliveredAmount;

  if (
    legacyDelivered !==
      undefined &&
    legacyDelivered !==
      null &&
    legacyDelivered !==
      "unavailable"
  ) {
    return legacyDelivered;
  }

  /*
   * Never treat DeliverMax as actual received
   * value for a partial payment.
   */
  if (
    isPartialPayment(
      tx
    )
  ) {
    return null;
  }

  if (
    tx.DeliverMax !==
      undefined
  ) {
    return tx.DeliverMax;
  }

  /*
   * Compatibility with API v1-style responses.
   */
  if (
    tx.Amount !==
      undefined
  ) {
    return tx.Amount;
  }

  return null;
}

type RpcSuccess = {
  ok: true;

  result:
    Record<string, unknown>;

  latencyMs:
    number;
};

type RpcFailure = {
  ok: false;

  code:
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "UPSTREAM_ERROR";

  upstreamCode:
    string | null;

  latencyMs:
    number | null;
};

async function rpc(
  method:
    string,

  params:
    Record<string, unknown>
): Promise<
  RpcSuccess |
  RpcFailure
> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      8_000
    );

  const startedAt =
    Date.now();

  try {
    const response =
      await fetch(
        process.env
          .XRPL_RPC_URL
          ?.trim() ||
          DEFAULT_XRPL_RPC,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              method,

              params: [
                {
                  ...params,
                  api_version:
                    2,
                },
              ],
            }),

          signal:
            controller.signal,

          cache:
            "no-store",
        }
      );

    const latencyMs =
      Date.now() -
      startedAt;

    if (
      response.status ===
        429
    ) {
      return {
        ok:
          false,

        code:
          "RATE_LIMITED",

        upstreamCode:
          null,

        latencyMs,
      };
    }

    if (
      !response.ok
    ) {
      return {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        upstreamCode:
          null,

        latencyMs,
      };
    }

    const body:
      unknown =
      await response
        .json()
        .catch(
          () =>
            null
        );

    if (
      !isRecord(
        body
      ) ||
      !isRecord(
        body.result
      )
    ) {
      return {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        upstreamCode:
          null,

        latencyMs,
      };
    }

    const upstreamCode =
      readString(
        body.result
          .error
      );

    if (
      upstreamCode
    ) {
      return {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        upstreamCode,

        latencyMs,
      };
    }

    return {
      ok:
        true,

      result:
        body.result,

      latencyMs,
    };
  } catch {
    return {
      ok:
        false,

      code:
        controller
          .signal
          .aborted
          ? "TIMEOUT"
          : "UPSTREAM_ERROR",

      upstreamCode:
        null,

      latencyMs:
        Date.now() -
        startedAt,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

function parseTransaction(
  row:
    unknown
): XrplObservedTransaction | null {
  if (
    !isRecord(
      row
    )
  ) {
    return null;
  }

  const tx =
    isRecord(
      row.tx_json
    )
      ? row.tx_json
      : {};

  const meta =
    isRecord(
      row.meta
    )
      ? row.meta
      : {};

  const hash =
    readString(
      row.hash
    ) ??
    readString(
      tx.hash
    );

  if (
    !hash
  ) {
    return null;
  }

  const amountValue =
    readPaymentDeliveredAmount(
      tx,
      meta
    );

  return {
    transactionHash:
      hash.toUpperCase(),

    ledgerIndex:
      readNumber(
        row.ledger_index
      ),

    timestamp:
      readString(
        row.close_time_iso
      ),

    validated:
      row.validated ===
      true,

    transactionType:
      readString(
        tx.TransactionType
      ),

    source:
      readString(
        tx.Account
      ),

    destination:
      readString(
        tx.Destination
      ),

    destinationTag:
      readNumber(
        tx.DestinationTag
      ),

    sourceTag:
      readNumber(
        tx.SourceTag
      ),

    amountDrops:
      readString(
        amountValue
      ),

    issuedAmount:
      readIssuedAmount(
        amountValue
      ),

    feeDrops:
      readString(
        tx.Fee
      ),

    result:
      readString(
        meta.TransactionResult
      ),
  };
}

function parseSignerLists(
  value:
    unknown
): XrplSignerList[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.flatMap(
    row => {
      if (
        !isRecord(
          row
        )
      ) {
        return [];
      }

      const quorum =
        readNumber(
          row.SignerQuorum
        );

      const entries =
        Array.isArray(
          row.SignerEntries
        )
          ? row.SignerEntries
          : [];

      if (
        quorum ===
          null
      ) {
        return [];
      }

      const signers =
        entries.flatMap(
          entry => {
            if (
              !isRecord(
                entry
              ) ||
              !isRecord(
                entry.SignerEntry
              )
            ) {
              return [];
            }

            const account =
              readString(
                entry.SignerEntry
                  .Account
              );

            const weight =
              readNumber(
                entry.SignerEntry
                  .SignerWeight
              );

            if (
              !account ||
              weight ===
                null
            ) {
              return [];
            }

            return [
              {
                account,
                weight,
              },
            ];
          }
        );

      return [
        {
          quorum,
          signers,
        },
      ];
    }
  );
}

function parseTrustLines(
  value:
    unknown
): XrplTrustLine[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.flatMap(
    row => {
      if (
        !isRecord(
          row
        )
      ) {
        return [];
      }

      const counterparty =
        readString(
          row.account
        );

      const currency =
        readString(
          row.currency
        );

      const balance =
        readString(
          row.balance
        );

      if (
        !counterparty ||
        !currency ||
        balance ===
          null
      ) {
        return [];
      }

      return [
        {
          counterparty,

          currency,

          balance,

          limit:
            readString(
              row.limit
            ),

          peerLimit:
            readString(
              row.limit_peer
            ),

          noRipple:
            readBoolean(
              row.no_ripple
            ),

          noRipplePeer:
            readBoolean(
              row.no_ripple_peer
            ),

          authorized:
            readBoolean(
              row.authorized
            ),

          peerAuthorized:
            readBoolean(
              row.peer_authorized
            ),

          freeze:
            readBoolean(
              row.freeze
            ),

          freezePeer:
            readBoolean(
              row.freeze_peer
            ),
        },
      ];
    }
  );
}

function parseAccountObjects(
  value:
    unknown
): XrplAccountObject[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.flatMap(
    row => {
      if (
        !isRecord(
          row
        )
      ) {
        return [];
      }

      const ledgerEntryType =
        readString(
          row.LedgerEntryType
        );

      if (
        !ledgerEntryType
      ) {
        return [];
      }

      return [
        {
          ledgerEntryType,

          index:
            readString(
              row.index
            ),

          flags:
            readNumber(
              row.Flags
            ),
        },
      ];
    }
  );
}

function fundingFromEarliestPage(
  address:
    string,

  rows:
    readonly unknown[]
): XrplFundingEvidence | null {
  const normalized =
    address.toLowerCase();

  for (
    const row of rows
  ) {
    const transaction =
      parseTransaction(
        row
      );

    if (
      !transaction ||
      transaction
        .transactionType !==
        "Payment" ||
      transaction
        .destination
        ?.toLowerCase() !==
        normalized ||
      !transaction.source ||
      transaction
        .source
        .toLowerCase() ===
        normalized ||
      transaction.result !==
        "tesSUCCESS"
    ) {
      continue;
    }

    return {
      source:
        transaction.source,

      destination:
        address,

      transactionHash:
        transaction
          .transactionHash,

      ledgerIndex:
        transaction
          .ledgerIndex,

      timestamp:
        transaction
          .timestamp,

      amountDrops:
        transaction
          .amountDrops,

      result:
        transaction
          .result,
    };
  }

  return null;
}

export async function getXrplAccountEvidence({
  address,
  analysisPlan =
    "free",
}: {
  address:
    string;

  analysisPlan?:
    AnalysisDepthPlan;
}): Promise<
  XrplProviderResult<
    XrplAccountEvidence
  >
> {
  const normalized =
    address.trim();

  const policy =
    getXrplAnalysisPolicy(
      analysisPlan
    );

  if (
    !isXrplClassicAddress(
      normalized
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "xrpl-public",

      latencyMs:
        null,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid XRP Ledger classic address.",
    };
  }

  const info =
    await rpc(
      "account_info",
      {
        account:
          normalized,

        ledger_index:
          "validated",

        queue:
          false,

        signer_lists:
          true,
      }
    );

  /*
   * A checksum-valid address can exist
   * mathematically without a funded
   * AccountRoot.
   */
  if (
    !info.ok &&
    info.upstreamCode ===
      "actNotFound"
  ) {
    return {
      ok:
        true,

      providerId:
        "xrpl-public",

      latencyMs:
        info.latencyMs ??
        0,

      data: {
        account: {
          exists:
            false,

          balanceDrops:
            null,

          sequence:
            null,

          ownerCount:
            null,

          flags:
            null,

          ledgerIndex:
            null,

          domain:
            null,

          regularKey:
            null,

          transferRate:
            null,

          tickSize:
            null,
        },

        transactions:
          [],

        nextCursor:
          null,

        trustLines:
          [],

        accountObjects:
          [],

        signerLists:
          [],

        firstObservedFunding:
          null,

        availability: {
          trustLines:
            true,

          accountObjects:
            true,

          earliestHistory:
            true,
        },

        coverage: {
          plan:
            analysisPlan,

          historyLimit:
            policy.historyLimit,

          earliestHistoryLimit:
            policy.earliestHistoryLimit,

          trustLineLimit:
            policy.trustLineLimit,

          accountObjectLimit:
            policy.accountObjectLimit,

          historyHasMore:
            false,

          trustLinesHaveMore:
            false,

          accountObjectsHaveMore:
            false,
        },
      },
    };
  }

  if (
    !info.ok
  ) {
    return {
      ok:
        false,

      providerId:
        "xrpl-public",

      latencyMs:
        info.latencyMs,

      code:
        info.code,

      error:
        "XRP Ledger account state is temporarily unavailable.",
    };
  }

  const accountData =
    isRecord(
      info.result
        .account_data
    )
      ? info.result
          .account_data
      : null;

  if (
    !accountData
  ) {
    return {
      ok:
        false,

      providerId:
        "xrpl-public",

      latencyMs:
        info.latencyMs,

      code:
        "UPSTREAM_ERROR",

      error:
        "XRP Ledger account response was incomplete.",
    };
  }

  /*
   * Account state is the hard dependency.
   * Auxiliary evidence is intentionally
   * degradable: if one supporting endpoint
   * is unavailable, the whole analysis does
   * not become unavailable.
   */
  const [
    history,
    earliestHistory,
    lines,
    objects,
  ] =
    await Promise.all([
      rpc(
        "account_tx",
        {
          account:
            normalized,

          ledger_index_min:
            -1,

          ledger_index_max:
            -1,

          binary:
            false,

          limit:
            policy.historyLimit,

          forward:
            false,
        }
      ),

      rpc(
        "account_tx",
        {
          account:
            normalized,

          ledger_index_min:
            -1,

          ledger_index_max:
            -1,

          binary:
            false,

          limit:
            policy.earliestHistoryLimit,

          forward:
            true,
        }
      ),

      rpc(
        "account_lines",
        {
          account:
            normalized,

          ledger_index:
            "validated",

          limit:
            policy.trustLineLimit,
        }
      ),

      rpc(
        "account_objects",
        {
          account:
            normalized,

          ledger_index:
            "validated",

          limit:
            policy.accountObjectLimit,
        }
      ),
    ]);

  /*
   * Recent transaction history remains a
   * core XRP evidence module. If it fails,
   * preserve V1 behavior and fail cleanly.
   */
  if (
    !history.ok
  ) {
    return {
      ok:
        false,

      providerId:
        "xrpl-public",

      latencyMs:
        history.latencyMs,

      code:
        history.code,

      error:
        "XRP Ledger transaction history is temporarily unavailable.",
    };
  }

  const historyRows =
    Array.isArray(
      history.result
        .transactions
    )
      ? history.result
          .transactions
      : [];

  const transactions =
    historyRows.flatMap(
      row => {
        const parsed =
          parseTransaction(
            row
          );

        return parsed
          ? [
              parsed,
            ]
          : [];
      }
    );

  const earliestRows =
    earliestHistory.ok &&
    Array.isArray(
      earliestHistory.result
        .transactions
    )
      ? earliestHistory.result
          .transactions
      : [];

  const trustLines =
    lines.ok
      ? parseTrustLines(
          lines.result.lines
        )
      : [];

  const accountObjects =
    objects.ok
      ? parseAccountObjects(
          objects.result
            .account_objects
        )
      : [];

  const signerLists =
    parseSignerLists(
      info.result
        .signer_lists
    );

  const marker =
    history.result
      .marker;

  const totalLatency =
    [
      info.latencyMs,
      history.latencyMs,
      earliestHistory.ok
        ? earliestHistory.latencyMs
        : 0,
      lines.ok
        ? lines.latencyMs
        : 0,
      objects.ok
        ? objects.latencyMs
        : 0,
    ].reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    );

  return {
    ok:
      true,

    providerId:
      "xrpl-public",

    latencyMs:
      totalLatency,

    data: {
      account: {
        exists:
          true,

        balanceDrops:
          readString(
            accountData
              .Balance
          ),

        sequence:
          readNumber(
            accountData
              .Sequence
          ),

        ownerCount:
          readNumber(
            accountData
              .OwnerCount
          ),

        flags:
          readNumber(
            accountData
              .Flags
          ),

        ledgerIndex:
          readNumber(
            info.result
              .ledger_index
          ),

        domain:
          readString(
            accountData
              .Domain
          ),

        regularKey:
          readString(
            accountData
              .RegularKey
          ),

        transferRate:
          readNumber(
            accountData
              .TransferRate
          ),

        tickSize:
          readNumber(
            accountData
              .TickSize
          ),
      },

      transactions,

      nextCursor:
        marker ===
          undefined
          ? null
          : JSON.stringify(
              marker
            ),

      trustLines,

      accountObjects,

      signerLists,

      firstObservedFunding:
        earliestHistory.ok
          ? fundingFromEarliestPage(
              normalized,
              earliestRows
            )
          : null,

      availability: {
        trustLines:
          lines.ok,

        accountObjects:
          objects.ok,

        earliestHistory:
          earliestHistory.ok,
      },

      coverage: {
        plan:
          analysisPlan,

        historyLimit:
          policy.historyLimit,

        earliestHistoryLimit:
          policy.earliestHistoryLimit,

        trustLineLimit:
          policy.trustLineLimit,

        accountObjectLimit:
          policy.accountObjectLimit,

        historyHasMore:
          history.result
            .marker !==
          undefined,

        trustLinesHaveMore:
          lines.ok &&
          lines.result
            .marker !==
            undefined,

        accountObjectsHaveMore:
          objects.ok &&
          objects.result
            .marker !==
            undefined,
      },
    },
  };
}