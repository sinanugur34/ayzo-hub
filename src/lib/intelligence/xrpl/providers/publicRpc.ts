import {
  isXrplClassicAddress,
} from "../address";

import type {
  XrplAccountEvidence,
  XrplObservedTransaction,
  XrplProviderResult,
} from "../types";

const DEFAULT_XRPL_RPC =
  "https://xrplcluster.com";

const HISTORY_LIMIT =
  10;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  value: unknown
) {
  return typeof value === "string"
    ? value
    : null;
}

function readNumber(
  value: unknown
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
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
  method: string,
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
        process.env.XRPL_RPC_URL
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
      response.status === 429
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
      !isRecord(body) ||
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
        body.result.error
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
        controller.signal
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

export async function getXrplAccountEvidence({
  address,
}: {
  address: string;
}): Promise<
  XrplProviderResult<
    XrplAccountEvidence
  >
> {
  const normalized =
    address.trim();

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
      }
    );

  /*
   * A checksum-valid XRPL address may
   * not yet have a funded AccountRoot.
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
        },

        transactions:
          [],

        nextCursor:
          null,
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
      info.result.account_data
    )
      ? info.result.account_data
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

  const history =
    await rpc(
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
          HISTORY_LIMIT,

        forward:
          false,
      }
    );

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

  const rows =
    Array.isArray(
      history.result.transactions
    )
      ? history.result.transactions
      : [];

  const transactions:
    XrplObservedTransaction[] =
      rows.flatMap(
        row => {
          if (
            !isRecord(row)
          ) {
            return [];
          }

          const hash =
            readString(
              row.hash
            );

          if (
            !hash
          ) {
            return [];
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

          /*
           * Native XRP Amount is a
           * string containing drops.
           * Issued currencies are
           * objects and intentionally
           * stay null here.
           */
          const amount =
            readString(
              tx.Amount
            );

          return [
            {
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

              amountDrops:
                amount,

              feeDrops:
                readString(
                  tx.Fee
                ),

              result:
                readString(
                  meta.TransactionResult
                ),
            },
          ];
        }
      );

  const marker =
    history.result.marker;

  return {
    ok:
      true,

    providerId:
      "xrpl-public",

    latencyMs:
      info.latencyMs +
      history.latencyMs,

    data: {
      account: {
        exists:
          true,

        balanceDrops:
          readString(
            accountData.Balance
          ),

        sequence:
          readNumber(
            accountData.Sequence
          ),

        ownerCount:
          readNumber(
            accountData.OwnerCount
          ),

        flags:
          readNumber(
            accountData.Flags
          ),

        ledgerIndex:
          readNumber(
            info.result.ledger_index
          ),
      },

      transactions,

      nextCursor:
        marker === undefined
          ? null
          : JSON.stringify(
              marker
            ),
    },
  };
}