import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizePolkadotAddress,
} from "./address";

import {
  getPolkadotAnalysisPolicy,
} from "./policy";

import type {
  PolkadotEvidence,
  PolkadotExtrinsicEvidence,
  PolkadotMultisigEvidence,
  PolkadotProviderErrorCode,
  PolkadotProviderResult,
  PolkadotProxyEvidence,
  PolkadotStakingEvidence,
  PolkadotTransferEvidence,
} from "./types";

const DEFAULT_SIDECAR =
  "https://polkadot-public-sidecar.parity-chains.parity.io";

const DEFAULT_SUBSCAN =
  "https://polkadot.api.subscan.io";

type JsonRecord =
  Record<string, unknown>;

export type PolkadotFetch =
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

export type PolkadotProviderDependencies = {
  fetchImpl:
    PolkadotFetch;

  sidecarUrl:
    string;

  subscanUrl:
    string;

  subscanApiKey:
    string | null;

  timeoutMs:
    number;
};

const DEFAULT_DEPS:
  PolkadotProviderDependencies = {
    fetchImpl:
      fetch,

    sidecarUrl:
      process.env
        .POLKADOT_SIDECAR_URL
        ?.trim() ||
      DEFAULT_SIDECAR,

    subscanUrl:
      process.env
        .POLKADOT_SUBSCAN_URL
        ?.trim() ||
      DEFAULT_SUBSCAN,

    subscanApiKey:
      process.env
        .POLKADOT_SUBSCAN_API_KEY
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

function bool(
  value:
    unknown
) {
  return typeof value ===
    "boolean"
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
    /^\d+$/.test(
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

function displayAddress(
  value:
    unknown
) {
  const row =
    record(
      value
    );

  return text(
    row?.address
  );
}

function errorCode(
  status:
    number
): PolkadotProviderErrorCode {
  if (
    status === 404
  ) {
    return "NOT_FOUND";
  }

  if (
    status === 402 ||
    status === 403 ||
    status === 429
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

async function requestJson(
  url:
    string,
  {
    fetchImpl,
    timeoutMs,
    init,
  }: {
    fetchImpl:
      PolkadotFetch;

    timeoutMs:
      number;

    init?:
      RequestInit;
  }
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
        PolkadotProviderErrorCode;

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
      timeoutMs
    );

  try {
    const response =
      await fetchImpl(
        url,
        {
          ...init,

          signal:
            controller.signal,

          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      return {
        ok:
          false,

        code:
          errorCode(
            response.status
          ),

        error:
          `Polkadot provider HTTP ${response.status}.`,
      };
    }

    const raw =
      await response.json();

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
          "Polkadot provider returned malformed JSON.",
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
          ? "Polkadot provider timed out."
          : "Polkadot provider request failed.",
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

function timestamp(
  value:
    unknown
) {
  const parsed =
    integer(
      value
    );

  if (
    parsed ===
      null
  ) {
    return null;
  }

  try {
    return new Date(
      parsed *
        1000
    ).toISOString();
  } catch {
    return null;
  }
}

function parseTransfer(
  value:
    unknown
): PolkadotTransferEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    from:
      text(
        row.from
      ),

    to:
      text(
        row.to
      ),

    amountPlanck:
      numericString(
        row.amount
      ),

    blockNumber:
      integer(
        row.block_num
      ),

    timestamp:
      timestamp(
        row.block_timestamp
      ),

    extrinsicIndex:
      text(
        row.extrinsic_index
      ),

    extrinsicHash:
      text(
        row.hash
      ) ??
      text(
        row.extrinsic_hash
      ),

    success:
      bool(
        row.success
      ),
  };
}

function parseExtrinsic(
  value:
    unknown
): PolkadotExtrinsicEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    module:
      text(
        row.call_module
      ),

    call:
      text(
        row.call_module_function
      ),

    blockNumber:
      integer(
        row.block_num
      ),

    timestamp:
      timestamp(
        row.block_timestamp
      ),

    extrinsicIndex:
      text(
        row.extrinsic_index
      ),

    extrinsicHash:
      text(
        row.extrinsic_hash
      ),

    success:
      bool(
        row.success
      ),

    feePlanck:
      numericString(
        row.fee_used
      ) ??
      numericString(
        row.fee
      ),
  };
}

function parseProxy(
  value:
    unknown
): PolkadotProxyEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    account:
      displayAddress(
        row.account_display
      ),

    realAccount:
      displayAddress(
        row.real_account_display
      ),

    module:
      text(
        row.call_module
      ),

    call:
      text(
        row.call_module_function
      ),

    extrinsicIndex:
      text(
        row.extrinsic_index
      ),

    timestamp:
      timestamp(
        row.block_timestamp
      ),
  };
}

function parseMultisig(
  value:
    unknown
): PolkadotMultisigEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    multiId:
      text(
        row.multi_id
      ),

    account:
      displayAddress(
        row.account_display
      ),

    multisigAccount:
      displayAddress(
        row.multi_account_display
      ) ??
      displayAddress(
        row.multisig_account_display
      ),

    status:
      text(
        row.status
      ),

    extrinsicIndex:
      text(
        row.confirm_extrinsic_idx
      ),

    timestamp:
      timestamp(
        row.timestamp
      ),
  };
}

function parseStaking(
  value:
    unknown
): PolkadotStakingEvidence | null {
  const data =
    record(
      value
    );

  if (!data) {
    return null;
  }

  const staking =
    record(
      data.staking_info
    );

  return {
    status:
      text(
        data.status
      ),

    bondedPlanck:
      numericString(
        data.bonded
      ),

    stashAddress:
      text(
        data.nominator_stash
      ),

    controllerAddress:
      text(
        staking?.controller
      ),

    rewardAddress:
      text(
        staking?.reward_account
      ),
  };
}

export async function getPolkadotEvidence(
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
    PolkadotProviderDependencies =
      DEFAULT_DEPS
): Promise<
  PolkadotProviderResult<
    PolkadotEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizePolkadotAddress(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "polkadot-sidecar",

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Polkadot SS58 mainnet address.",
    };
  }

  const policy =
    getPolkadotAnalysisPolicy(
      analysisPlan
    );

  let requestsUsed =
    0;

  const accountResult =
    await requestJson(
      `${deps.sidecarUrl}/accounts/${encodeURIComponent(normalized)}/balance-info`,
      {
        fetchImpl:
          deps.fetchImpl,

        timeoutMs:
          deps.timeoutMs,
      }
    );

  requestsUsed +=
    1;

  if (!accountResult.ok) {
    return {
      ok:
        false,

      providerId:
        "polkadot-sidecar",

      latencyMs:
        Date.now() -
        started,

      code:
        accountResult.code,

      error:
        accountResult.error,
    };
  }

  const at =
    record(
      accountResult
        .data.at
    );

  const unavailableEvidence:
    string[] = [];

  let transfers:
    PolkadotTransferEvidence[] =
      [];

  let extrinsics:
    PolkadotExtrinsicEvidence[] =
      [];

  let proxies:
    PolkadotProxyEvidence[] =
      [];

  let multisig:
    PolkadotMultisigEvidence[] =
      [];

  let staking:
    PolkadotStakingEvidence |
    null =
      null;

  const key =
    deps.subscanApiKey;

  const subscanPost =
    async (
      path:
        string,
      body:
        JsonRecord
    ) => {
      if (
        !key ||
        requestsUsed >=
          policy
            .providerRequestBudget
      ) {
        return null;
      }

      requestsUsed +=
        1;

      return requestJson(
        `${deps.subscanUrl}${path}`,
        {
          fetchImpl:
            deps.fetchImpl,

          timeoutMs:
            deps.timeoutMs,

          init: {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "X-API-Key":
                key,
            },

            body:
              JSON.stringify(
                body
              ),
          },
        }
      );
    };

  if (!key) {
    unavailableEvidence.push(
      "indexed_transfer_history",
      "extrinsic_history",
      "staking_details",
      "proxy_evidence",
      "multisig_evidence"
    );
  } else {
    const [
      transferResult,
      extrinsicResult,
      stakingResult,
      proxyResult,
      multisigResult,
    ] =
      await Promise.all([
        subscanPost(
          "/api/v2/scan/transfers",
          {
            address:
              normalized,

            page:
              0,

            row:
              policy
                .transferLimit,

            direction:
              "all",

            success:
              true,
          }
        ),

        subscanPost(
          "/api/v2/scan/extrinsics",
          {
            address:
              normalized,

            page:
              0,

            row:
              policy
                .extrinsicLimit,

            order:
              "desc",
          }
        ),

        subscanPost(
          "/api/scan/staking/nominator",
          {
            address:
              normalized,
          }
        ),

        subscanPost(
          "/api/scan/proxy/extrinsics",
          {
            account:
              normalized,

            page:
              0,

            row:
              policy
                .proxyLimit,

            order:
              "desc",
          }
        ),

        subscanPost(
          "/api/scan/multisigs/details",
          {
            account:
              normalized,

            page:
              0,

            row:
              policy
                .multisigLimit,
          }
        ),
      ]);

    if (
      transferResult?.ok
    ) {
      const data =
        record(
          transferResult
            .data.data
        );

      transfers =
        array(
          data?.transfers
        )
          .map(
            parseTransfer
          )
          .filter(
            (
              item
            ): item is PolkadotTransferEvidence =>
              item !== null
          )
          .slice(
            0,
            policy
              .transferLimit
          );
    } else {
      unavailableEvidence.push(
        "indexed_transfer_history"
      );
    }

    if (
      extrinsicResult?.ok
    ) {
      const data =
        record(
          extrinsicResult
            .data.data
        );

      extrinsics =
        array(
          data?.extrinsics
        )
          .map(
            parseExtrinsic
          )
          .filter(
            (
              item
            ): item is PolkadotExtrinsicEvidence =>
              item !== null
          )
          .slice(
            0,
            policy
              .extrinsicLimit
          );
    } else {
      unavailableEvidence.push(
        "extrinsic_history"
      );
    }

    if (
      stakingResult?.ok
    ) {
      staking =
        parseStaking(
          stakingResult
            .data.data
        );
    } else {
      unavailableEvidence.push(
        "staking_details"
      );
    }

    if (
      proxyResult?.ok
    ) {
      const data =
        record(
          proxyResult
            .data.data
        );

      proxies =
        array(
          data?.extrinsics
        )
          .map(
            parseProxy
          )
          .filter(
            (
              item
            ): item is PolkadotProxyEvidence =>
              item !== null
          )
          .slice(
            0,
            policy
              .proxyLimit
          );
    } else {
      unavailableEvidence.push(
        "proxy_evidence"
      );
    }

    if (
      multisigResult?.ok
    ) {
      const data =
        record(
          multisigResult
            .data.data
        );

      multisig =
        array(
          data?.multisig
        )
          .map(
            parseMultisig
          )
          .filter(
            (
              item
            ): item is PolkadotMultisigEvidence =>
              item !== null
          )
          .slice(
            0,
            policy
              .multisigLimit
          );
    } else {
      unavailableEvidence.push(
        "multisig_evidence"
      );
    }
  }

  return {
    ok:
      true,

    providerId:
      key
        ? "polkadot-sidecar-subscan"
        : "polkadot-sidecar",

    latencyMs:
      Date.now() -
      started,

    data: {
      network:
        "polkadot",

      address:
        normalized,

      analysisPlan,

      account: {
        nonce:
          numericString(
            accountResult
              .data.nonce
          ),

        tokenSymbol:
          text(
            accountResult
              .data.tokenSymbol
          ),

        freePlanck:
          numericString(
            accountResult
              .data.free
          ),

        reservedPlanck:
          numericString(
            accountResult
              .data.reserved
          ),

        frozenPlanck:
          numericString(
            accountResult
              .data.frozen
          ),

        transferablePlanck:
          numericString(
            accountResult
              .data.transferable
          ),

        blockHeight:
          integer(
            at?.height
          ),

        blockHash:
          text(
            at?.hash
          ),
      },

      transfers,
      extrinsics,
      staking,
      proxies,
      multisig,

      coverage: {
        plan:
          analysisPlan,

        transferLimit:
          policy
            .transferLimit,

        extrinsicLimit:
          policy
            .extrinsicLimit,

        proxyLimit:
          policy
            .proxyLimit,

        multisigLimit:
          policy
            .multisigLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        indexedProviderConfigured:
          Boolean(
            key
          ),

        unavailableEvidence:
          [
            ...new Set(
              unavailableEvidence
            ),
          ],

        coverage:
          unavailableEvidence
            .length >
            0
            ? "partial"
            : "complete",
      },
    },
  };
}
