import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeHederaAccountId,
} from "./address";

import {
  getHederaAnalysisPolicy,
} from "./policy";

import type {
  HederaHbarTransfer,
  HederaMirrorEvidence,
  HederaNftEvidence,
  HederaNftTransfer,
  HederaObservedTransaction,
  HederaProviderResult,
  HederaTokenRelationship,
  HederaTokenTransfer,
} from "./types";

const DEFAULT_MIRROR_URL =
  "https://mainnet-public.mirrornode.hedera.com/api/v1";

type JsonRecord =
  Record<string, unknown>;

export type HederaFetch =
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

export type HederaProviderDependencies = {
  fetchImpl:
    HederaFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  HederaProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .HEDERA_MIRROR_URL
        ?.trim() ||
      DEFAULT_MIRROR_URL,

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
    )
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
    /^-?[0-9]+$/.test(
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

  return null;
}

function hasNextLink(
  value:
    unknown
) {
  const links =
    record(
      value
    );

  return Boolean(
    text(
      links?.next
    )
  );
}

function parseHbarTransfer(
  value:
    unknown
): HederaHbarTransfer | null {
  const row =
    record(
      value
    );

  const accountId =
    text(
      row?.account
    );

  const amount =
    numericString(
      row?.amount
    );

  if (
    !accountId ||
    amount === null
  ) {
    return null;
  }

  return {
    accountId,

    amountTinybar:
      amount,

    approval:
      bool(
        row?.is_approval
      ),
  };
}

function parseTokenTransfer(
  value:
    unknown
): HederaTokenTransfer | null {
  const row =
    record(
      value
    );

  const tokenId =
    text(
      row?.token_id
    );

  const accountId =
    text(
      row?.account
    );

  const amount =
    numericString(
      row?.amount
    );

  if (
    !tokenId ||
    !accountId ||
    amount === null
  ) {
    return null;
  }

  return {
    tokenId,
    accountId,
    amount,

    approval:
      bool(
        row?.is_approval
      ),
  };
}

function parseNftTransfer(
  value:
    unknown
): HederaNftTransfer | null {
  const row =
    record(
      value
    );

  const tokenId =
    text(
      row?.token_id
    );

  const serialNumber =
    safeInteger(
      row?.serial_number
    );

  if (
    !tokenId ||
    serialNumber === null
  ) {
    return null;
  }

  return {
    tokenId,
    serialNumber,

    senderAccountId:
      text(
        row
          ?.sender_account_id
      ),

    receiverAccountId:
      text(
        row
          ?.receiver_account_id
      ),

    approval:
      bool(
        row?.is_approval
      ),
  };
}

function parseTransaction(
  value:
    unknown
): HederaObservedTransaction | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const transactionId =
    text(
      row.transaction_id
    );

  const consensusTimestamp =
    text(
      row.consensus_timestamp
    );

  if (
    !transactionId &&
    !consensusTimestamp
  ) {
    return null;
  }

  return {
    transactionId,

    consensusTimestamp,

    name:
      text(
        row.name
      ),

    result:
      text(
        row.result
      ),

    chargedTxFeeTinybar:
      numericString(
        row.charged_tx_fee
      ),

    transfers:
      array(
        row.transfers
      )
        .map(
          parseHbarTransfer
        )
        .filter(
          (
            item
          ): item is HederaHbarTransfer =>
            item !== null
        ),

    tokenTransfers:
      array(
        row.token_transfers
      )
        .map(
          parseTokenTransfer
        )
        .filter(
          (
            item
          ): item is HederaTokenTransfer =>
            item !== null
        ),

    nftTransfers:
      array(
        row.nft_transfers
      )
        .map(
          parseNftTransfer
        )
        .filter(
          (
            item
          ): item is HederaNftTransfer =>
            item !== null
        ),
  };
}

function parseTokenRelationship(
  value:
    unknown
): HederaTokenRelationship | null {
  const row =
    record(
      value
    );

  const tokenId =
    text(
      row?.token_id
    );

  if (!tokenId) {
    return null;
  }

  return {
    tokenId,

    balance:
      numericString(
        row?.balance
      ),

    automaticAssociation:
      bool(
        row
          ?.automatic_association
      ),

    createdTimestamp:
      text(
        row
          ?.created_timestamp
      ),

    freezeStatus:
      text(
        row?.freeze_status
      ),

    kycStatus:
      text(
        row?.kyc_status
      ),
  };
}

function parseNft(
  value:
    unknown
): HederaNftEvidence | null {
  const row =
    record(
      value
    );

  const tokenId =
    text(
      row?.token_id
    );

  const serialNumber =
    safeInteger(
      row?.serial_number
    );

  if (
    !tokenId ||
    serialNumber === null
  ) {
    return null;
  }

  return {
    tokenId,
    serialNumber,

    accountId:
      text(
        row?.account_id
      ),

    spender:
      text(
        row?.spender
      ),

    delegatingSpender:
      text(
        row
          ?.delegating_spender
      ),

    createdTimestamp:
      text(
        row
          ?.created_timestamp
      ),

    modifiedTimestamp:
      text(
        row
          ?.modified_timestamp
      ),

    deleted:
      bool(
        row?.deleted
      ),

    metadata:
      text(
        row?.metadata
      ),
  };
}

async function request(
  url:
    string,
  deps:
    HederaProviderDependencies
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
    const response =
      await deps.fetchImpl(
        url,
        {
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
            404
            ? "NOT_FOUND"
            : response.status ===
                429
              ? "RATE_LIMITED"
              : "UPSTREAM_ERROR",

        error:
          `Hedera Mirror HTTP ${response.status}.`,
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
          "Hedera Mirror returned invalid JSON.",
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
          "Hedera Mirror response was malformed.",
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
          "Hedera Mirror request timed out.",
      };
    }

    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Hedera Mirror request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

function withLimit(
  base:
    string,
  path:
    string,
  limit:
    number,
  extra:
    Record<
      string,
      string
    > = {}
) {
  const url =
    new URL(
      `${base}${path}`
    );

  url.searchParams.set(
    "limit",
    String(
      limit
    )
  );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      extra
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  return url.toString();
}

export async function getHederaMirrorEvidence(
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
    HederaProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  HederaProviderResult<
    HederaMirrorEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeHederaAccountId(
      accountId
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "hedera-mirror-public",

      latencyMs:
        0,

      code:
        "INVALID_ACCOUNT",

      error:
        "Invalid Hedera account ID.",
    };
  }

  const policy =
    getHederaAnalysisPolicy(
      analysisPlan
    );

  const encoded =
    encodeURIComponent(
      normalized
    );

  const accountResult =
    await request(
      `${deps.baseUrl}/accounts/${encoded}`,
      deps
    );

  if (
    !accountResult.ok
  ) {
    return {
      ok:
        false,

      providerId:
        "hedera-mirror-public",

      latencyMs:
        Date.now() -
        started,

      code:
        accountResult.code,

      error:
        accountResult.error,
    };
  }

  const [
    transactionResult,
    tokenResult,
    nftResult,
  ] =
    await Promise.all([
      request(
        withLimit(
          deps.baseUrl,
          "/transactions",
          policy
            .transactionLimit,
          {
            "account.id":
              normalized,

            order:
              "desc",
          }
        ),
        deps
      ),

      request(
        withLimit(
          deps.baseUrl,
          `/accounts/${encoded}/tokens`,
          policy
            .tokenRelationshipLimit
        ),
        deps
      ),

      request(
        withLimit(
          deps.baseUrl,
          `/accounts/${encoded}/nfts`,
          policy
            .nftLimit
        ),
        deps
      ),
    ]);

  const account =
    accountResult.data;

  const accountIdValue =
    text(
      account.account
    );

  if (!accountIdValue) {
    return {
      ok:
        false,

      providerId:
        "hedera-mirror-public",

      latencyMs:
        Date.now() -
        started,

      code:
        "MALFORMED_RESPONSE",

      error:
        "Hedera account response was malformed.",
    };
  }

  const balance =
    record(
      account.balance
    );

  const unavailableEvidence:
    string[] = [
      "token_control_keys",
      "staking_reward_history",
    ];

  let transactions:
    HederaObservedTransaction[] =
      [];

  let tokenRelationships:
    HederaTokenRelationship[] =
      [];

  let nfts:
    HederaNftEvidence[] =
      [];

  let historyHasMore =
    false;

  let tokensHaveMore =
    false;

  let nftsHaveMore =
    false;

  if (
    transactionResult.ok
  ) {
    transactions =
      array(
        transactionResult
          .data.transactions
      )
        .map(
          parseTransaction
        )
        .filter(
          (
            item
          ): item is HederaObservedTransaction =>
            item !== null
        )
        .slice(
          0,
          policy
            .transactionLimit
        );

    historyHasMore =
      hasNextLink(
        transactionResult
          .data.links
      );
  } else {
    unavailableEvidence.push(
      "transaction_history"
    );
  }

  if (
    tokenResult.ok
  ) {
    tokenRelationships =
      array(
        tokenResult
          .data.tokens
      )
        .map(
          parseTokenRelationship
        )
        .filter(
          (
            item
          ): item is HederaTokenRelationship =>
            item !== null
        )
        .slice(
          0,
          policy
            .tokenRelationshipLimit
        );

    tokensHaveMore =
      hasNextLink(
        tokenResult
          .data.links
      );
  } else {
    unavailableEvidence.push(
      "token_relationships"
    );
  }

  if (
    nftResult.ok
  ) {
    nfts =
      array(
        nftResult
          .data.nfts
      )
        .map(
          parseNft
        )
        .filter(
          (
            item
          ): item is HederaNftEvidence =>
            item !== null
        )
        .slice(
          0,
          policy
            .nftLimit
        );

    nftsHaveMore =
      hasNextLink(
        nftResult
          .data.links
      );
  } else {
    unavailableEvidence.push(
      "nfts"
    );
  }

  const partial =
    unavailableEvidence
      .length > 2 ||
    historyHasMore ||
    tokensHaveMore ||
    nftsHaveMore;

  return {
    ok:
      true,

    providerId:
      "hedera-mirror-public",

    latencyMs:
      Date.now() -
      started,

    data: {
      account: {
        accountId:
          accountIdValue,

        alias:
          text(
            account.alias
          ),

        evmAddress:
          text(
            account.evm_address
          ),

        balanceTinybar:
          numericString(
            balance?.balance
          ),

        balanceTimestamp:
          text(
            balance?.timestamp
          ),

        deleted:
          bool(
            account.deleted
          ),

        ethereumNonce:
          numericString(
            account
              .ethereum_nonce
          ),

        memo:
          text(
            account.memo
          ),

        receiverSignatureRequired:
          bool(
            account
              .receiver_sig_required
          ),

        stakedAccountId:
          text(
            account
              .staked_account_id
          ),

        stakedNodeId:
          numericString(
            account
              .staked_node_id
          ),

        stakePeriodStart:
          text(
            account
              .stake_period_start
          ),

        pendingRewardTinybar:
          numericString(
            account
              .pending_reward
          ),

        declineReward:
          bool(
            account
              .decline_reward
          ),
      },

      transactions,

      tokenRelationships,

      nfts,

      coverage: {
        plan:
          analysisPlan,

        transactionLimit:
          policy
            .transactionLimit,

        tokenRelationshipLimit:
          policy
            .tokenRelationshipLimit,

        nftLimit:
          policy
            .nftLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          4,

        historyHasMore,

        tokensHaveMore,

        nftsHaveMore,

        tokenControlMetadataAvailable:
          false,

        coverage:
          partial
            ? "partial"
            : "complete",

        unavailableEvidence,
      },
    },
  };
}
