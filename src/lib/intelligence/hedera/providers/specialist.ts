import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeHederaAccountId,
} from "../address";

import {
  getHederaAnalysisPolicy,
} from "../policy";

import type {
  HederaProviderResult,
  HederaTokenControlKeys,
} from "../types";

const DEFAULT_MIRROR_URL =
  "https://mainnet-public.mirrornode.hedera.com/api/v1";

type JsonRecord =
  Record<string, unknown>;

export type HederaTokenMetadataEvidence = {
  tokenId:
    string;

  name:
    string | null;

  symbol:
    string | null;

  type:
    string | null;

  decimals:
    number | null;

  totalSupply:
    string | null;

  treasuryAccountId:
    string | null;

  pauseStatus:
    string | null;

  controls:
    HederaTokenControlKeys;
};

export type HederaStakingRewardEvidence = {
  accountId:
    string | null;

  amountTinybar:
    string | null;

  timestamp:
    string | null;
};

export type HederaSpecialistEvidence = {
  tokenMetadata:
    readonly HederaTokenMetadataEvidence[];

  stakingRewards:
    readonly HederaStakingRewardEvidence[];

  coverage: {
    tokenMetadataRequested:
      number;

    tokenMetadataReturned:
      number;

    stakingRewardsAvailable:
      boolean;

    providerRequestsUsed:
      number;

    unavailableEvidence:
      readonly string[];
  };
};

export type HederaSpecialistFetch =
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

export type HederaSpecialistDependencies = {
  fetchImpl:
    HederaSpecialistFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPS:
  HederaSpecialistDependencies = {
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

function numberValue(
  value:
    unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function numericString(
  value:
    unknown
) {
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
    return String(value);
  }

  return null;
}

async function request(
  url:
    string,
  deps:
    HederaSpecialistDependencies
): Promise<
  JsonRecord | null
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
      await providerUsageFetch({ provider: "hedera-mirror-public", operation: "hedera.specialist" }, url, () => deps.fetchImpl(
        url,
        {
          signal:
            controller.signal,
        }
      ));

    if (
      !response.ok
    ) {
      return null;
    }

    try {
      return record(
        await response.json()
      );
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(
      timer
    );
  }
}

function parseToken(
  tokenId:
    string,
  row:
    JsonRecord
): HederaTokenMetadataEvidence {
  return {
    tokenId,

    name:
      text(
        row.name
      ),

    symbol:
      text(
        row.symbol
      ),

    type:
      text(
        row.type
      ),

    decimals:
      numberValue(
        row.decimals
      ),

    totalSupply:
      numericString(
        row.total_supply
      ),

    treasuryAccountId:
      text(
        row
          .treasury_account_id
      ),

    pauseStatus:
      text(
        row.pause_status
      ),

    controls: {
      admin:
        row.admin_key ??
        null,

      supply:
        row.supply_key ??
        null,

      wipe:
        row.wipe_key ??
        null,

      freeze:
        row.freeze_key ??
        null,

      kyc:
        row.kyc_key ??
        null,

      pause:
        row.pause_key ??
        null,

      feeSchedule:
        row
          .fee_schedule_key ??
        null,
    },
  };
}

export async function getHederaSpecialistEvidence(
  {
    accountId,
    tokenIds,
    analysisPlan,
  }: {
    accountId:
      string;

    tokenIds:
      readonly string[];

    analysisPlan:
      AnalysisDepthPlan;
  },
  deps:
    HederaSpecialistDependencies =
      DEFAULT_DEPS
): Promise<
  HederaProviderResult<
    HederaSpecialistEvidence
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

  const uniqueTokenIds =
    [...new Set(
      tokenIds
    )]
      .slice(
        0,
        policy
          .tokenMetadataLimit
      );

  const tokenRows =
    await Promise.all(
      uniqueTokenIds.map(
        async tokenId => ({
          tokenId,

          row:
            await request(
              `${deps.baseUrl}/tokens/${encodeURIComponent(tokenId)}`,
              deps
            ),
        })
      )
    );

  const rewardUrl =
    new URL(
      `${deps.baseUrl}/accounts/${encodeURIComponent(normalized)}/rewards`
    );

  rewardUrl.searchParams.set(
    "limit",
    String(
      policy
        .stakingRewardLimit
    )
  );

  rewardUrl.searchParams.set(
    "order",
    "desc"
  );

  const rewardRow =
    await request(
      rewardUrl.toString(),
      deps
    );

  const tokenMetadata =
    tokenRows
      .filter(
        (
          item
        ): item is {
          tokenId:
            string;

          row:
            JsonRecord;
        } =>
          item.row !==
            null
      )
      .map(
        item =>
          parseToken(
            item.tokenId,
            item.row
          )
      );

  const rewards =
    array(
      rewardRow
        ?.rewards
    )
      .map(
        item => {
          const row =
            record(item);

          if (!row) {
            return null;
          }

          return {
            accountId:
              text(
                row.account_id
              ),

            amountTinybar:
              numericString(
                row.amount
              ),

            timestamp:
              text(
                row.timestamp
              ),
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          item !== null
      );

  const unavailable:
    string[] = [];

  if (
    tokenMetadata.length <
    uniqueTokenIds.length
  ) {
    unavailable.push(
      "some_token_metadata"
    );
  }

  if (!rewardRow) {
    unavailable.push(
      "staking_rewards"
    );
  }

  return {
    ok:
      true,

    providerId:
      "hedera-mirror-public",

    latencyMs:
      Date.now() -
      started,

    data: {
      tokenMetadata,

      stakingRewards:
        rewards,

      coverage: {
        tokenMetadataRequested:
          uniqueTokenIds.length,

        tokenMetadataReturned:
          tokenMetadata.length,

        stakingRewardsAvailable:
          rewardRow !== null,

        providerRequestsUsed:
          uniqueTokenIds.length +
          1,

        unavailableEvidence:
          unavailable,
      },
    },
  };
}
