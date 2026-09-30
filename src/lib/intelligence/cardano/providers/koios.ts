import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  isCardanoPaymentAddress,
} from "../address";

import {
  getCardanoAnalysisPolicy,
} from "../policy";

import type {
  CardanoAddressState,
  CardanoAssetAmount,
  CardanoCanonicalTransaction,
  CardanoEvidence,
  CardanoProviderResult,
  CardanoStakeEvidence,
  CardanoTransactionSummary,
  CardanoUtxoEvidence,
} from "../types";

const DEFAULT_KOIOS_URL =
  "https://api.koios.rest/api/v1";

type JsonRecord =
  Record<string, unknown>;

export type KoiosFetch =
  (
    input: string,
    init?: RequestInit
  ) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;

export type KoiosDependencies = {
  fetchImpl:
    KoiosFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  KoiosDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .CARDANO_KOIOS_URL
        ?.trim() ||
      DEFAULT_KOIOS_URL,

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
) {
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

function booleanValue(
  value: unknown
) {
  return typeof value === "boolean"
    ? value
    : null;
}

function mapStatus(
  status: number
) {
  if (status === 404) {
    return "NOT_FOUND" as const;
  }

  if (
    status === 429 ||
    status === 402
  ) {
    return "RATE_LIMITED" as const;
  }

  return "UPSTREAM_ERROR" as const;
}

function parseAssetList(
  value: unknown
): CardanoAssetAmount[] {
  return array(value)
    .map(item => {
      const row =
        record(item);

      if (!row) {
        return null;
      }

      const policyId =
        text(
          row.policy_id
        );

      const assetName =
        text(
          row.asset_name
        );

      const quantity =
        text(
          row.quantity
        ) ??
        text(
          row.asset_quantity
        );

      if (!quantity) {
        return null;
      }

      if (
        !policyId &&
        !assetName
      ) {
        return {
          unit:
            "lovelace",
          quantity,
          policyId:
            null,
          assetNameHex:
            null,
        };
      }

      const unit =
        `${policyId ?? ""}${assetName ?? ""}`;

      return {
        unit,
        quantity,
        policyId:
          policyId ??
          null,
        assetNameHex:
          assetName ??
          null,
      };
    })
    .filter(
      (
        item
      ): item is CardanoAssetAmount =>
        item !== null
    );
}

function parseAddressState(
  body: unknown,
  address: string
): CardanoAddressState | null {
  const rows =
    array(body);

  const row =
    record(
      rows[0]
    );

  if (!row) {
    return null;
  }

  const balance =
    text(
      row.balance
    ) ??
    "0";

  const assets =
    parseAssetList(
      row.asset_list
    );

  return {
    address,

    stakeAddress:
      text(
        row.stake_address
      ),

    script:
      booleanValue(
        row.is_script
      ),

    nativeBalanceLovelace:
      balance,

    assets,
  };
}

function parseTxSummary(
  value: unknown
): CardanoTransactionSummary | null {
  const row =
    record(value);

  const hash =
    text(
      row?.tx_hash
    );

  if (!hash) {
    return null;
  }

  const blockTime =
    text(
      row?.tx_timestamp
    );

  return {
    transactionHash:
      hash,

    blockHeight:
      numberValue(
        row?.block_height
      ),

    blockTime:
      blockTime ??
      null,
  };
}

function parseUtxo(
  value: unknown
): CardanoUtxoEvidence | null {
  const row =
    record(value);

  if (!row) {
    return null;
  }

  const txHash =
    text(
      row.tx_hash
    );

  const index =
    numberValue(
      row.tx_index
    ) ??
    numberValue(
      row.output_index
    );

  if (
    !txHash ||
    index === null
  ) {
    return null;
  }

  const amounts =
    [
      {
        unit:
          "lovelace",
        quantity:
          text(
            row.value
          ) ??
          "0",
        policyId:
          null,
        assetNameHex:
          null,
      },
      ...parseAssetList(
        row.asset_list
      ),
    ];

  return {
    transactionHash:
      txHash,

    outputIndex:
      index,

    blockHash:
      text(
        row.block_hash
      ),

    amounts,

    datumHash:
      text(
        row.datum_hash
      ),

    inlineDatum:
      text(
        row.inline_datum
      ),

    referenceScriptHash:
      text(
        row.reference_script
      ),
  };
}

function parseCanonical(
  value: unknown,
  hash:
    string
): CardanoCanonicalTransaction | null {
  const rows =
    array(value);

  const row =
    record(
      rows[0]
    );

  if (!row) {
    return null;
  }

  const inputs =
    array(
      row.inputs
    )
      .map(item => {
        const input =
          record(item);

        if (!input) {
          return null;
        }

        const amounts =
          [
            {
              unit:
                "lovelace",
              quantity:
                text(
                  input.value
                ) ??
                "0",
              policyId:
                null,
              assetNameHex:
                null,
            },
            ...parseAssetList(
              input.asset_list
            ),
          ];

        return {
          address:
            text(
              input.payment_addr
            ) ??
            text(
              input.address
            ),

          transactionHash:
            text(
              input.tx_hash
            ),

          outputIndex:
            numberValue(
              input.tx_index
            ),

          amounts,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          item !== null
      );

  const outputs =
    array(
      row.outputs
    )
      .map(item => {
        const output =
          record(item);

        if (!output) {
          return null;
        }

        const amounts =
          [
            {
              unit:
                "lovelace",
              quantity:
                text(
                  output.value
                ) ??
                "0",
              policyId:
                null,
              assetNameHex:
                null,
            },
            ...parseAssetList(
              output.asset_list
            ),
          ];

        return {
          address:
            text(
              output.payment_addr
            ) ??
            text(
              output.address
            ),

          outputIndex:
            numberValue(
              output.tx_index
            ),

          amounts,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          item !== null
      );

  return {
    transactionHash:
      hash,

    blockHash:
      text(
        row.block_hash
      ),

    blockHeight:
      numberValue(
        row.block_height
      ),

    blockTime:
      text(
        row.tx_timestamp
      ),

    feeLovelace:
      text(
        row.fee
      ),

    validContract:
      booleanValue(
        row.valid_contract
      ),

    inputs,

    outputs,
  };
}

function parseStake(
  body: unknown,
  stakeAddress:
    string
): CardanoStakeEvidence | null {
  const rows =
    array(body);

  const row =
    record(
      rows[0]
    );

  if (!row) {
    return null;
  }

  return {
    stakeAddress,

    active:
      booleanValue(
        row.status
      ) ??
      (
        text(
          row.status
        ) ===
        "registered"
          ? true
          : null
      ),

    poolId:
      text(
        row.delegated_pool
      ),

    controlledAmount:
      text(
        row.total_balance
      ),

    rewardsAvailable:
      text(
        row.rewards_available
      ),

    withdrawalsTotal:
      text(
        row.withdrawals
      ),

    reservesSum:
      text(
        row.reserves
      ),

    treasurySum:
      text(
        row.treasury
      ),
  };
}

async function requestJson(
  path:
    string,
  deps:
    KoiosDependencies
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
        `${deps.baseUrl}${path}`,
        {
          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      return {
        ok:
          false,

        code:
          mapStatus(
            response.status
          ),

        error:
          `Koios HTTP ${response.status}.`,
      };
    }

    try {
      return {
        ok:
          true,

        data:
          await response.json(),
      };
    } catch {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "Koios returned invalid JSON.",
      };
    }
  } catch (error) {
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
          "Koios request timed out.",
      };
    }

    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Koios request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

export async function getCardanoKoiosEvidence(
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
    KoiosDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  CardanoProviderResult<
    CardanoEvidence
  >
> {
  const started =
    Date.now();

  if (
    !isCardanoPaymentAddress(
      address
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "cardano-koios",

      latencyMs:
        Date.now() -
        started,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Cardano mainnet payment address.",
    };
  }

  const policy =
    getCardanoAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const run =
    async (
      path:
        string
    ) => {
      if (
        requestsUsed >=
        policy
          .providerRequestBudget
      ) {
        return {
          ok:
            false as const,

          code:
            "UPSTREAM_ERROR" as const,

          error:
            "Koios request budget exhausted.",
        };
      }

      requestsUsed +=
        1;

      return requestJson(
        path,
        deps
      );
    };

  const stateResult =
    await run(
      `/address_info?_address=${encodeURIComponent(address)}`
    );

  if (!stateResult.ok) {
    return {
      ok:
        false,

      providerId:
        "cardano-koios",

      latencyMs:
        Date.now() -
        started,

      code:
        stateResult.code,

      error:
        stateResult.error,
    };
  }

  const addressState =
    parseAddressState(
      stateResult.data,
      address
    );

  if (!addressState) {
    return {
      ok:
        false,

      providerId:
        "cardano-koios",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Koios address response was malformed.",
    };
  }

  const txResult =
    await run(
      `/address_txs?_address=${encodeURIComponent(address)}`
    );

  if (!txResult.ok) {
    return {
      ok:
        false,

      providerId:
        "cardano-koios",

      latencyMs:
        Date.now() -
        started,

      code:
        txResult.code,

      error:
        txResult.error,
    };
  }

  const allTransactions =
    array(
      txResult.data
    )
      .map(
        parseTxSummary
      )
      .filter(
        (
          item
        ): item is CardanoTransactionSummary =>
          item !== null
      );

  const recentTransactions =
    allTransactions
      .slice(
        0,
        policy
          .historyLimit
      );

  const earliestTransactions =
    [...allTransactions]
      .reverse()
      .slice(
        0,
        policy
          .earliestHistoryLimit
      );

  const utxoResult =
    await run(
      `/address_utxos?_address=${encodeURIComponent(address)}`
    );

  const utxos =
    utxoResult.ok
      ? array(
          utxoResult.data
        )
          .map(
            parseUtxo
          )
          .filter(
            (
              item
            ): item is CardanoUtxoEvidence =>
              item !== null
          )
          .slice(
            0,
            policy.utxoLimit
          )
      : [];

  const canonicalTargets =
    recentTransactions.slice(
      0,
      policy
        .canonicalSampleLimit
    );

  const canonicalTransactions:
    CardanoCanonicalTransaction[] =
      [];

  let canonicalUnavailable =
    0;

  for (
    const tx of
    canonicalTargets
  ) {
    if (
      requestsUsed >=
      policy
        .providerRequestBudget
    ) {
      canonicalUnavailable +=
        1;
      continue;
    }

    const txResult =
      await run(
        `/tx_info?_tx_hashes=${encodeURIComponent(tx.transactionHash)}`
      );

    if (!txResult.ok) {
      canonicalUnavailable +=
        1;
      continue;
    }

    const parsed =
      parseCanonical(
        txResult.data,
        tx.transactionHash
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

  let stake:
    CardanoStakeEvidence | null =
      null;

  if (
    addressState.stakeAddress &&
    requestsUsed <
      policy
        .providerRequestBudget
  ) {
    const stakeResult =
      await run(
        `/account_info?_stake_address=${encodeURIComponent(addressState.stakeAddress)}`
      );

    if (stakeResult.ok) {
      stake =
        parseStake(
          stakeResult.data,
          addressState
            .stakeAddress
        );
    }
  }

  return {
    ok:
      true,

    providerId:
      "cardano-koios",

    latencyMs:
      Date.now() -
      started,

    data: {
      addressState,

      recentTransactions,

      earliestTransactions,

      utxos,

      canonicalTransactions,

      stake,

      coverage: {
        plan:
          analysisPlan,

        historyLimit:
          policy.historyLimit,

        earliestHistoryLimit:
          policy
            .earliestHistoryLimit,

        utxoLimit:
          policy.utxoLimit,

        assetLimit:
          policy.assetLimit,

        canonicalSampleLimit:
          policy
            .canonicalSampleLimit,

        canonicalRequested:
          canonicalTargets.length,

        canonicalVerified:
          canonicalTransactions.length,

        canonicalUnavailable,

        historyHasMore:
          allTransactions.length >
          policy
            .historyLimit,

        utxosHaveMore:
          false,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        primaryProvider:
          "cardano-koios",

        fallbackProvider:
          null,

        fallbackUsed:
          false,
      },
    },
  };
}
