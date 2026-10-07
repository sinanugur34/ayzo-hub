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
  ZcashTransparentUtxo,
} from "./types";

const DEFAULT_URL =
  "https://zecbook.nownodes.io";

type JsonRecord =
  Record<string, unknown>;

type FetchLike =
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
    /^-?\d+$/.test(
      value
    )
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

function numericString(
  value:
    unknown
) {
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

function addressFrom(
  value:
    unknown
) {
  const row =
    record(
      value
    );

  const addresses =
    array(
      row?.addresses
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

  for (
    const candidate of
    addresses
  ) {
    const normalized =
      normalizeZcashTransparentAddress(
        candidate
      );

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function mapStatus(
  status:
    number
): ZcashProviderErrorCode {
  if (
    status === 400 ||
    status === 422
  ) {
    return "INVALID_ADDRESS";
  }

  if (
    status === 404
  ) {
    return "NOT_FOUND";
  }

  if (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 429
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

export async function getZcashNownodesEvidence(
  {
    address,
    analysisPlan,
  }: {
    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps: {
    fetchImpl?:
      FetchLike;

    baseUrl?:
      string;

    apiKey?:
      string | null;

    timeoutMs?:
      number;
  } = {}
): Promise<
  ZcashProviderResult<
    ZcashEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeZcashTransparentAddress(
      address
    );

  const kind =
    normalized
      ? getZcashAddressKind(
          normalized
        )
      : null;

  if (
    !normalized ||
    (
      kind !==
        "transparent-p2pkh" &&
      kind !==
        "transparent-p2sh"
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-nownodes",

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Zcash transparent mainnet address.",
    };
  }

  const apiKey =
    deps.apiKey ??
    process.env
      .ZCASH_NOWNODES_API_KEY
      ?.trim() ??
    null;

  if (!apiKey) {
    return {
      ok:
        false,

      providerId:
        "zcash-nownodes",

      latencyMs:
        0,

      code:
        "UPSTREAM_ERROR",

      error:
        "Zcash NOWNodes fallback is not configured.",
    };
  }

  const base =
    (
      deps.baseUrl ??
      process.env
        .ZCASH_NOWNODES_URL
        ?.trim() ??
      DEFAULT_URL
    ).replace(
      /\/+$/,
      ""
    );

  const fetchImpl =
    deps.fetchImpl ??
    fetch;

  const timeoutMs =
    deps.timeoutMs ??
    12_000;

  const policy =
    getZcashAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const request =
    async (
      path:
        string
    ): Promise<
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
            ZcashProviderErrorCode;

          error:
            string;
        }
    > => {
      if (
        requestsUsed >=
          policy
            .providerRequestBudget
      ) {
        return {
          ok:
            false,

          code:
            "UPSTREAM_ERROR",

          error:
            "Zcash NOWNodes request budget exhausted.",
        };
      }

      requestsUsed +=
        1;

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          timeoutMs
        );

      try {
        const response =
          await providerUsageFetch({ provider: "nownodes", operation: "zcash.rpc" }, `${base}${path}`, () => fetchImpl(
            `${base}${path}`,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json",

                "api-key":
                  apiKey,
              },

              cache:
                "no-store",

              signal:
                controller
                  .signal,
            }
          ));

        if (!response.ok) {
          return {
            ok:
              false,

            code:
              mapStatus(
                response.status
              ),

            error:
              `NOWNodes Zcash HTTP ${response.status}.`,
          };
        }

        return {
          ok:
            true,

          data:
            await response.json(),
        };
      } catch (
        error
      ) {
        return {
          ok:
            false,

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
              ? "NOWNodes Zcash request timed out."
              : "NOWNodes Zcash request failed.",
        };
      } finally {
        clearTimeout(
          timer
        );
      }
    };

  const encoded =
    encodeURIComponent(
      normalized
    );

  const accountResult =
    await request(
      `/api/v2/address/${encoded}?page=1&pageSize=${policy.historyLimit}&details=txids`
    );

  if (!accountResult.ok) {
    return {
      ok:
        false,

      providerId:
        "zcash-nownodes",

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
      accountResult.data
    );

  if (
    !account ||
    text(
      account.address
    ) !==
      normalized
  ) {
    return {
      ok:
        false,

      providerId:
        "zcash-nownodes",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "NOWNodes Zcash address response did not match the requested address.",
    };
  }

  const txids =
    array(
      account.txids
    )
      .map(
        text
      )
      .filter(
        (
          item
        ): item is string =>
          Boolean(
            item &&
            /^[0-9a-fA-F]{64}$/.test(
              item
            )
          )
      )
      .map(
        item =>
          item.toLowerCase()
      )
      .slice(
        0,
        policy
          .historyLimit
      );

  const utxoResult =
    await request(
      `/api/v2/utxo/${encoded}?confirmed=true`
    );

  const utxos:
    ZcashTransparentUtxo[] =
      [];

  if (
    utxoResult.ok &&
    Array.isArray(
      utxoResult.data
    )
  ) {
    for (
      const item of
      utxoResult.data
    ) {
      const row =
        record(
          item
        );

      const txid =
        text(
          row?.txid
        );

      const outputIndex =
        integer(
          row?.vout
        );

      const zatoshis =
        numericString(
          row?.value
        );

      if (
        !txid ||
        !/^[0-9a-fA-F]{64}$/.test(
          txid
        ) ||
        outputIndex ===
          null ||
        zatoshis ===
          null
      ) {
        continue;
      }

      utxos.push({
        txid:
          txid.toLowerCase(),

        height:
          integer(
            row?.height
          ),

        outputIndex,

        zatoshis,
      });

      if (
        utxos.length >=
          policy
            .utxoLimit
      ) {
        break;
      }
    }
  }

  const canonicalTransactions:
    ZcashCanonicalTransaction[] =
      [];

  let canonicalUnavailable =
    0;

  const targets =
    txids.slice(
      0,
      policy
        .canonicalSampleLimit
    );

  for (
    const txid of
    targets
  ) {
    const txResult =
      await request(
        `/api/v2/tx/${encodeURIComponent(txid)}`
      );

    if (!txResult.ok) {
      canonicalUnavailable +=
        1;

      continue;
    }

    const tx =
      record(
        txResult.data
      );

    if (
      !tx ||
      text(
        tx.txid
      )?.toLowerCase() !==
        txid
    ) {
      canonicalUnavailable +=
        1;

      continue;
    }

    const inputs:
      ZcashTransparentInput[] =
      array(
        tx.vin
      ).map(
        value => {
          const row =
            record(
              value
            );

          return {
            previousTransactionHash:
              text(
                row?.txid
              )?.toLowerCase() ??
              null,

            previousOutputIndex:
              integer(
                row?.vout
              ),

            address:
              addressFrom(
                row
              ),

            valueZatoshis:
              numericString(
                row?.value
              ),
          };
        }
      );

    const outputs:
      ZcashTransparentOutput[] =
      array(
        tx.vout
      ).map(
        (
          value,
          index
        ) => {
          const row =
            record(
              value
            );

          return {
            index:
              integer(
                row?.n
              ) ??
              index,

            address:
              addressFrom(
                row
              ),

            valueZatoshis:
              numericString(
                row?.value
              ),
          };
        }
      );

    canonicalTransactions.push({
      txid,

      height:
        integer(
          tx.blockHeight
        ),

      timestamp:
        integer(
          tx.blockTime
        ) !==
          null
          ? new Date(
              (
                integer(
                  tx.blockTime
                ) ??
                0
              ) *
                1000
            ).toISOString()
          : null,

      coinbase:
        array(
          tx.vin
        ).some(
          value =>
            Boolean(
              record(
                value
              )?.coinbase
            )
        ),

      inputs,
      outputs,
    });
  }

  const txCount =
    integer(
      account.txs
    );

  return {
    ok:
      true,

    providerId:
      "zcash-nownodes",

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
          account.balance
        ),

      totalReceivedZatoshis:
        numericString(
          account.totalReceived
        ),

      totalSpentZatoshis:
        numericString(
          account.totalSent
        ),

      transactions:
        txids.map(
          txid => ({
            txid,
            height:
              null,
            timestamp:
              null,
          })
        ),

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

        historyHasMore:
          txCount !==
            null
            ? txCount >
              txids.length
            : txids.length >=
              policy
                .historyLimit,

        utxosHaveMore:
          utxos.length >=
          policy
            .utxoLimit,

        canonicalRequested:
          targets.length,

        canonicalVerified:
          canonicalTransactions
            .length,

        canonicalUnavailable,
      },
    },
  };
}
