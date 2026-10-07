import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import {
  isCardanoPaymentAddress,
} from "../address";

import {
  getCardanoAnalysisPolicy,
} from "../policy";

import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

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

const DEFAULT_BASE_URL =
  "https://cardano-mainnet.blockfrost.io/api/v0";

type JsonRecord =
  Record<string, unknown>;

export type CardanoFetch =
  (
    input: string,
    init?: RequestInit
  ) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;

export type BlockfrostDependencies = {
  fetchImpl: CardanoFetch;
  baseUrl: string;
  projectId: string | null;
  timeoutMs: number;
};

const DEFAULT_DEPENDENCIES:
  BlockfrostDependencies = {
    fetchImpl: fetch,
    baseUrl:
      process.env
        .CARDANO_BLOCKFROST_URL
        ?.trim() ||
      DEFAULT_BASE_URL,
    projectId:
      process.env
        .CARDANO_BLOCKFROST_PROJECT_ID
        ?.trim() ||
      null,
    timeoutMs: 12_000,
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
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function text(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function numberValue(
  value: unknown
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function booleanValue(
  value: unknown
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function toIsoFromUnixSeconds(
  value: unknown
): string | null {
  const seconds =
    numberValue(value);

  if (seconds === null) {
    return null;
  }

  return new Date(
    seconds * 1000
  ).toISOString();
}

function mapStatus(
  status: number
) {
  if (status === 404) {
    return "NOT_FOUND" as const;
  }

  if (
    status === 402 ||
    status === 418 ||
    status === 429
  ) {
    return "RATE_LIMITED" as const;
  }

  return "UPSTREAM_ERROR" as const;
}

function parseAmounts(
  value: unknown
): CardanoAssetAmount[] {
  return array(value)
    .map(item => {
      const row =
        record(item);

      const unit =
        text(row?.unit);

      const quantity =
        text(row?.quantity);

      if (
        !unit ||
        !quantity
      ) {
        return null;
      }

      const isAda =
        unit === "lovelace";

      return {
        unit,
        quantity,
        policyId:
          isAda
            ? null
            : unit.slice(
                0,
                56
              ) || null,
        assetNameHex:
          isAda
            ? null
            : unit.slice(
                56
              ) || null,
      };
    })
    .filter(
      (
        item
      ): item is CardanoAssetAmount =>
        item !== null
    );
}

function lovelaceAmount(
  amounts:
    readonly CardanoAssetAmount[]
) {
  return (
    amounts.find(
      item =>
        item.unit ===
        "lovelace"
    )?.quantity ??
    "0"
  );
}

async function requestJson(
  path: string,
  deps: BlockfrostDependencies
): Promise<
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR"
        | "MALFORMED_RESPONSE";
      error: string;
    }
> {
  if (!deps.projectId) {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      error:
        "Cardano Blockfrost project id is not configured.",
    };
  }

  const projectId =
    deps.projectId;

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
      await providerUsageFetch({ provider: "cardano-blockfrost", operation: "cardano.http" }, `${deps.baseUrl}${path}`, () => deps.fetchImpl(
        `${deps.baseUrl}${path}`,
        {
          headers: {
            project_id:
              projectId,
          },
          signal:
            controller.signal,
        }
      ));

    if (!response.ok) {
      return {
        ok: false,
        code:
          mapStatus(
            response.status
          ),
        error:
          `Blockfrost HTTP ${response.status}.`,
      };
    }

    try {
      return {
        ok: true,
        data:
          await response.json(),
      };
    } catch {
      return {
        ok: false,
        code:
          "MALFORMED_RESPONSE",
        error:
          "Blockfrost returned invalid JSON.",
      };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return {
        ok: false,
        code:
          "TIMEOUT",
        error:
          "Blockfrost request timed out.",
      };
    }

    return {
      ok: false,
      code:
        "UPSTREAM_ERROR",
      error:
        "Blockfrost request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseAddressState(
  body: unknown,
  address: string
): CardanoAddressState | null {
  const row =
    record(body);

  if (!row) {
    return null;
  }

  const amounts =
    parseAmounts(
      row.amount
    );

  return {
    address:
      text(row.address) ??
      address,

    stakeAddress:
      text(
        row.stake_address
      ),

    script:
      booleanValue(
        row.script
      ),

    nativeBalanceLovelace:
      lovelaceAmount(
        amounts
      ),

    assets:
      amounts.filter(
        item =>
          item.unit !==
          "lovelace"
      ),
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

  return {
    transactionHash:
      hash,

    blockHeight:
      numberValue(
        row?.block_height
      ),

    blockTime:
      toIsoFromUnixSeconds(
        row?.block_time
      ),
  };
}

function parseUtxo(
  value: unknown
): CardanoUtxoEvidence | null {
  const row =
    record(value);

  const txHash =
    text(
      row?.tx_hash
    );

  const index =
    numberValue(
      row?.output_index
    );

  if (
    !txHash ||
    index === null
  ) {
    return null;
  }

  return {
    transactionHash:
      txHash,

    outputIndex:
      index,

    blockHash:
      text(
        row?.block
      ),

    amounts:
      parseAmounts(
        row?.amount
      ),

    datumHash:
      text(
        row?.data_hash
      ),

    inlineDatum:
      text(
        row?.inline_datum
      ),

    referenceScriptHash:
      text(
        row?.reference_script_hash
      ),
  };
}

function parseCanonicalTransaction(
  metaBody: unknown,
  utxoBody: unknown
): CardanoCanonicalTransaction | null {
  const meta =
    record(metaBody);

  const utxo =
    record(utxoBody);

  if (
    !meta ||
    !utxo
  ) {
    return null;
  }

  const hash =
    text(
      meta.hash
    );

  if (!hash) {
    return null;
  }

  const inputs =
    array(
      utxo.inputs
    )
      .map(item => {
        const row =
          record(item);

        if (!row) {
          return null;
        }

        return {
          address:
            text(
              row.address
            ),

          transactionHash:
            text(
              row.tx_hash
            ),

          outputIndex:
            numberValue(
              row.output_index
            ),

          amounts:
            parseAmounts(
              row.amount
            ),
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
      utxo.outputs
    )
      .map(item => {
        const row =
          record(item);

        if (!row) {
          return null;
        }

        return {
          address:
            text(
              row.address
            ),

          outputIndex:
            numberValue(
              row.output_index
            ),

          amounts:
            parseAmounts(
              row.amount
            ),
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
        meta.block
      ),

    blockHeight:
      numberValue(
        meta.block_height
      ),

    blockTime:
      toIsoFromUnixSeconds(
        meta.block_time
      ),

    feeLovelace:
      text(
        meta.fees
      ),

    validContract:
      booleanValue(
        meta.valid_contract
      ),

    inputs,

    outputs,
  };
}

function parseStake(
  body: unknown
): CardanoStakeEvidence | null {
  const row =
    record(body);

  const stakeAddress =
    text(
      row?.stake_address
    );

  if (!stakeAddress) {
    return null;
  }

  return {
    stakeAddress,

    active:
      booleanValue(
        row?.active
      ),

    poolId:
      text(
        row?.pool_id
      ),

    controlledAmount:
      text(
        row?.controlled_amount
      ),

    rewardsAvailable:
      text(
        row?.rewards_sum
      ),

    withdrawalsTotal:
      text(
        row?.withdrawals_sum
      ),

    reservesSum:
      text(
        row?.reserves_sum
      ),

    treasurySum:
      text(
        row?.treasury_sum
      ),
  };
}

export async function getCardanoBlockfrostEvidence(
  {
    address,
    analysisPlan,
  }: {
    address: string;
    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    BlockfrostDependencies =
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
      ok: false,
      providerId:
        "cardano-blockfrost",
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
      path: string
    ) => {
      if (
        requestsUsed >=
        policy
          .providerRequestBudget
      ) {
        return {
          ok: false as const,
          code:
            "UPSTREAM_ERROR" as const,
          error:
            "Cardano provider request budget exhausted.",
        };
      }

      requestsUsed += 1;

      return requestJson(
        path,
        deps
      );
    };

  const addressStateResult =
    await run(
      `/addresses/${encodeURIComponent(address)}`
    );

  if (!addressStateResult.ok) {
    return {
      ok: false,
      providerId:
        "cardano-blockfrost",
      latencyMs:
        Date.now() -
        started,
      code:
        addressStateResult.code,
      error:
        addressStateResult.error,
    };
  }

  const addressState =
    parseAddressState(
      addressStateResult.data,
      address
    );

  if (!addressState) {
    return {
      ok: false,
      providerId:
        "cardano-blockfrost",
      latencyMs:
        Date.now() -
        started,
      code:
        "MALFORMED_RESPONSE",
      error:
        "Blockfrost address state was malformed.",
    };
  }

  const recentResult =
    await run(
      `/addresses/${encodeURIComponent(address)}/transactions?order=desc&count=${policy.historyLimit + 1}`
    );

  if (!recentResult.ok) {
    return {
      ok: false,
      providerId:
        "cardano-blockfrost",
      latencyMs:
        Date.now() -
        started,
      code:
        recentResult.code,
      error:
        recentResult.error,
    };
  }

  const recentRows =
    array(
      recentResult.data
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

  const historyHasMore =
    recentRows.length >
      policy.historyLimit;

  const recentTransactions =
    recentRows.slice(
      0,
      policy.historyLimit
    );

  const earliestResult =
    await run(
      `/addresses/${encodeURIComponent(address)}/transactions?order=asc&count=${policy.earliestHistoryLimit}`
    );

  const earliestTransactions =
    earliestResult.ok
      ? array(
          earliestResult.data
        )
          .map(
            parseTxSummary
          )
          .filter(
            (
              item
            ): item is CardanoTransactionSummary =>
              item !== null
          )
          .slice(
            0,
            policy
              .earliestHistoryLimit
          )
      : [];

  const utxoResult =
    await run(
      `/addresses/${encodeURIComponent(address)}/utxos?order=desc&count=${policy.utxoLimit + 1}`
    );

  const rawUtxos =
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
      : [];

  const utxosHaveMore =
    rawUtxos.length >
      policy.utxoLimit;

  const utxos =
    rawUtxos.slice(
      0,
      policy.utxoLimit
    );

  const canonicalTransactions:
    CardanoCanonicalTransaction[] =
      [];

  let canonicalUnavailable =
    0;

  const canonicalTargets =
    recentTransactions.slice(
      0,
      policy.canonicalSampleLimit
    );

  for (
    const tx of
    canonicalTargets
  ) {
    if (
      requestsUsed + 2 >
      policy
        .providerRequestBudget
    ) {
      canonicalUnavailable += 1;
      continue;
    }

    const [
      metaResult,
      txUtxoResult,
    ] =
      await Promise.all([
        run(
          `/txs/${tx.transactionHash}`
        ),
        run(
          `/txs/${tx.transactionHash}/utxos`
        ),
      ]);

    if (
      !metaResult.ok ||
      !txUtxoResult.ok
    ) {
      canonicalUnavailable += 1;
      continue;
    }

    const parsed =
      parseCanonicalTransaction(
        metaResult.data,
        txUtxoResult.data
      );

    if (!parsed) {
      canonicalUnavailable += 1;
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
        `/accounts/${encodeURIComponent(addressState.stakeAddress)}`
      );

    if (stakeResult.ok) {
      stake =
        parseStake(
          stakeResult.data
        );
    }
  }

  return {
    ok: true,
    providerId:
      "cardano-blockfrost",
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
        historyHasMore,
        utxosHaveMore,
        providerRequestBudget:
          policy
            .providerRequestBudget,
        providerRequestsUsed:
          requestsUsed,
        primaryProvider:
          "cardano-blockfrost",
        fallbackProvider:
          null,
        fallbackUsed:
          false,
      },
    },
  };
}
