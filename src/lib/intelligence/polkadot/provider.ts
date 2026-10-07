import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
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

const DEFAULT_PUBFI =
  "https://api.pubfi.ai";

/*
 * Real mainnet acceptance:
 *
 * PubFi :free Subscan gateway allows at most
 * 20 rows per request for the current account.
 *
 * Direct Subscan's upstream schema allows at most
 * 100 rows per request.
 *
 * AYZO plan depth remains independent from either
 * transport's per-request pagination envelope.
 */
const PUBFI_FREE_ROW_LIMIT =
  20;

const SUBSCAN_ROW_LIMIT =
  100;

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

  pubfiUrl?:
    string;

  pubfiApiKey?:
    string | null;

  pubfiFreeRequestDelayMs?:
    number;

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

    pubfiUrl:
      process.env
        .PUBFI_API_URL
        ?.trim() ||
      DEFAULT_PUBFI,

    pubfiApiKey:
      process.env
        .PUBFI_API_KEY
        ?.trim() ||
      null,

    /*
     * PubFi advertises 2 free requests / second
     * for these Subscan routes.
     *
     * Sequential ~550 ms spacing keeps AYZO
     * below that advertised window.
     */
    pubfiFreeRequestDelayMs:
      550,

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
      await providerUsageFetch({ operation: "polkadot.http" }, url, () => fetchImpl(
        url,
        {
          ...init,

          signal:
            controller.signal,

          cache:
            "no-store",
        }
      ));

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

function deterministicEvidenceIdentity(
  parts:
    readonly (
      string |
      number |
      boolean |
      null
    )[]
) {
  return JSON.stringify(
    parts
  );
}

function dedupeDeterministically<T>(
  items:
    readonly T[],
  identity:
    (
      item:
        T
    ) => string
) {
  const seen =
    new Set<string>();

  const deduped:
    T[] =
      [];

  for (
    const item of
    items
  ) {
    const key =
      identity(
        item
      );

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    deduped.push(
      item
    );
  }

  return deduped;
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

  const pubfiKey =
    deps.pubfiApiKey
      ?.trim() ||
    null;

  const subscanKey =
    deps.subscanApiKey
      ?.trim() ||
    null;

  const indexedProvider:
    "pubfi" |
    "subscan" |
    null =
      pubfiKey
        ? "pubfi"
        : subscanKey
          ? "subscan"
          : null;

  const pubfiBase =
    (
      deps.pubfiUrl ??
      DEFAULT_PUBFI
    ).replace(
      /\/+$/,
      ""
    );

  const subscanBase =
    deps.subscanUrl
      .replace(
        /\/+$/,
        ""
      );

  const pubfiDelayMs =
    Math.max(
      0,
      deps
        .pubfiFreeRequestDelayMs ??
      550
    );

  let pubfiRequests =
    0;

  const wait =
    (
      ms:
        number
    ) =>
      new Promise<void>(
        resolve =>
          setTimeout(
            resolve,
            ms
          )
      );

  const validateIndexedEnvelope =
    (
      result:
        Awaited<
          ReturnType<
            typeof requestJson
          >
        >,
      providerLabel:
        string
    ):
      Awaited<
        ReturnType<
          typeof requestJson
        >
      > => {
      if (!result.ok) {
        return result;
      }

      if (
        !Object.prototype
          .hasOwnProperty
          .call(
            result.data,
            "code"
          )
      ) {
        /*
         * Compatibility with older/direct mocks and
         * transports that return only the data object.
         */
        return result;
      }

      const logicalCode =
        integer(
          result
            .data
            .code
        );

      if (
        logicalCode ===
          null
      ) {
        return {
          ok:
            false,

          code:
            "MALFORMED_RESPONSE",

          error:
            `${providerLabel} returned an invalid logical status.`,
        };
      }

      if (
        logicalCode !==
          0
      ) {
        return {
          ok:
            false,

          code:
            errorCode(
              logicalCode
            ),

          error:
            `${providerLabel} returned logical code ${logicalCode}.`,
        };
      }

      return result;
    };

  const indexedPost =
    async (
      path:
        string,
      body:
        JsonRecord
    ) => {
      if (
        !indexedProvider ||
        requestsUsed >=
          policy
            .providerRequestBudget
      ) {
        return null;
      }

      requestsUsed +=
        1;

      if (
        indexedProvider ===
          "pubfi"
      ) {
        if (
          pubfiRequests >
            0 &&
          pubfiDelayMs >
            0
        ) {
          await wait(
            pubfiDelayMs
          );
        }

        pubfiRequests +=
          1;

        const result =
          await requestJson(
            `${pubfiBase}/v1/gateway/subscan/polkadot${path}:free`,
            {
              fetchImpl:
                deps.fetchImpl,

              timeoutMs:
                deps.timeoutMs,

              init: {
                method:
                  "POST",

                headers: {
                  Authorization:
                    `Bearer ${pubfiKey}`,

                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    body
                  ),
              },
            }
          );

        return validateIndexedEnvelope(
          result,
          "Polkadot PubFi/Subscan"
        );
      }

      const result =
        await requestJson(
          `${subscanBase}${path}`,
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
                  subscanKey as
                    string,
              },

              body:
                JSON.stringify(
                  body
                ),
            },
          }
        );

      return validateIndexedEnvelope(
        result,
        "Polkadot Subscan"
      );
    };

  const indexedCollection =
    async (
      {
        path,
        body,
        limit,
        property,
      }: {
        path:
          string;

        body:
          JsonRecord;

        limit:
          number;

        property:
          string;
      }
    ): Promise<{
      ok:
        boolean;

      items:
        unknown[];
    }> => {
      const items:
        unknown[] =
          [];

      const seen =
        new Set<string>();

      const pageLimit =
        indexedProvider ===
          "pubfi"
          ? PUBFI_FREE_ROW_LIMIT
          : SUBSCAN_ROW_LIMIT;

      /*
       * Page size must remain stable across a paginated
       * Subscan/PubFi walk. Changing row size on the last
       * page can change page offset semantics.
       */
      const row =
        Math.min(
          pageLimit,
          limit
        );

      const evidenceIdentity =
        (
          value:
            unknown
        ): string | null => {
          if (
            path ===
              "/api/v2/scan/transfers"
          ) {
            const item =
              parseTransfer(
                value
              );

            if (!item) {
              return null;
            }

            return deterministicEvidenceIdentity([
              item.extrinsicHash,
              item.extrinsicIndex,
              item.blockNumber,
              item.timestamp,
              item.from,
              item.to,
              item.amountPlanck,
              item.success,
            ]);
          }

          if (
            path ===
              "/api/v2/scan/extrinsics"
          ) {
            const item =
              parseExtrinsic(
                value
              );

            if (!item) {
              return null;
            }

            return deterministicEvidenceIdentity([
              item.extrinsicHash,
              item.extrinsicIndex,
              item.blockNumber,
              item.timestamp,
              item.module,
              item.call,
              item.feePlanck,
              item.success,
            ]);
          }

          if (
            path ===
              "/api/scan/proxy/extrinsics"
          ) {
            const item =
              parseProxy(
                value
              );

            if (!item) {
              return null;
            }

            return deterministicEvidenceIdentity([
              item.extrinsicIndex,
              item.timestamp,
              item.account,
              item.realAccount,
              item.module,
              item.call,
            ]);
          }

          if (
            path ===
              "/api/scan/multisigs/details"
          ) {
            const item =
              parseMultisig(
                value
              );

            if (!item) {
              return null;
            }

            return deterministicEvidenceIdentity([
              item.multiId,
              item.extrinsicIndex,
              item.timestamp,
              item.account,
              item.multisigAccount,
              item.status,
            ]);
          }

          return null;
        };

      let page =
        0;

      while (
        items.length <
          limit
      ) {
        const result =
          await indexedPost(
            path,
            {
              ...body,

              page,

              row,
            }
          );

        if (
          !result ||
          !result.ok
        ) {
          return {
            ok:
              false,

            items,
          };
        }

        const rawData =
          result
            .data
            .data;

        /*
         * Subscan uses a successful null payload for
         * valid zero-evidence module/account queries.
         */
        if (
          rawData ===
            null
        ) {
          return {
            ok:
              true,

            items,
          };
        }

        if (
          rawData ===
            undefined
        ) {
          return {
            ok:
              false,

            items,
          };
        }

        const data =
          record(
            rawData
          );

        if (!data) {
          return {
            ok:
              false,

            items,
          };
        }

        const batch =
          array(
            data[
              property
            ]
          );

        /*
         * Count only parseable unique evidence toward
         * the selected plan depth.
         *
         * This prevents cross-page overlap from
         * consuming the depth budget before unique
         * evidence reaches the requested limit.
         */
        for (
          const item of
          batch
        ) {
          const key =
            evidenceIdentity(
              item
            );

          if (
            !key ||
            seen.has(
              key
            )
          ) {
            continue;
          }

          seen.add(
            key
          );

          items.push(
            item
          );

          if (
            items.length >=
              limit
          ) {
            break;
          }
        }

        /*
         * Only a short provider page proves exhaustion.
         * A full overlapping page must not stop the walk.
         */
        if (
          batch.length <
            row
        ) {
          break;
        }

        page +=
          1;
      }

      return {
        ok:
          true,

        items:
          items.slice(
            0,
            limit
          ),
      };
    };

  if (!indexedProvider) {
    unavailableEvidence.push(
      "indexed_transfer_history",
      "extrinsic_history",
      "staking_details",
      "proxy_evidence",
      "multisig_evidence"
    );
  } else {
    const transferResult =
      await indexedCollection({
        path:
          "/api/v2/scan/transfers",

        body: {
          address:
            normalized,

          direction:
            "all",

          success:
            true,
        },

        limit:
          policy
            .transferLimit,

        property:
          "transfers",
      });

    const extrinsicResult =
      await indexedCollection({
        path:
          "/api/v2/scan/extrinsics",

        body: {
          address:
            normalized,

          order:
            "desc",
        },

        limit:
          policy
            .extrinsicLimit,

        property:
          "extrinsics",
      });

    const stakingResult =
      await indexedPost(
        "/api/scan/staking/nominator",
        {
          address:
            normalized,
        }
      );

    const proxyResult =
      await indexedCollection({
        path:
          "/api/scan/proxy/extrinsics",

        body: {
          account:
            normalized,

          order:
            "desc",
        },

        limit:
          policy
            .proxyLimit,

        property:
          "extrinsics",
      });

    const multisigResult =
      await indexedCollection({
        path:
          "/api/scan/multisigs/details",

        body: {
          account:
            normalized,
        },

        limit:
          policy
            .multisigLimit,

        property:
          "multisig",
      });

    transfers =
      dedupeDeterministically(
        transferResult
          .items
          .map(
            parseTransfer
          )
          .filter(
            (
              item
            ): item is PolkadotTransferEvidence =>
              item !== null
          ),
        item =>
          deterministicEvidenceIdentity([
            item.extrinsicHash,
            item.extrinsicIndex,
            item.blockNumber,
            item.timestamp,
            item.from,
            item.to,
            item.amountPlanck,
            item.success,
          ])
      )
        .slice(
          0,
          policy
            .transferLimit
        );

    if (
      !transferResult.ok
    ) {
      unavailableEvidence.push(
        "indexed_transfer_history"
      );
    }

    extrinsics =
      dedupeDeterministically(
        extrinsicResult
          .items
          .map(
            parseExtrinsic
          )
          .filter(
            (
              item
            ): item is PolkadotExtrinsicEvidence =>
              item !== null
          ),
        item =>
          deterministicEvidenceIdentity([
            item.extrinsicHash,
            item.extrinsicIndex,
            item.blockNumber,
            item.timestamp,
            item.module,
            item.call,
            item.feePlanck,
            item.success,
          ])
      )
        .slice(
          0,
          policy
            .extrinsicLimit
        );

    if (
      !extrinsicResult.ok
    ) {
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
            .data
            .data
        );
    } else {
      unavailableEvidence.push(
        "staking_details"
      );
    }

    proxies =
      dedupeDeterministically(
        proxyResult
          .items
          .map(
            parseProxy
          )
          .filter(
            (
              item
            ): item is PolkadotProxyEvidence =>
              item !== null
          ),
        item =>
          deterministicEvidenceIdentity([
            item.extrinsicIndex,
            item.timestamp,
            item.account,
            item.realAccount,
            item.module,
            item.call,
          ])
      )
        .slice(
          0,
          policy
            .proxyLimit
        );

    if (
      !proxyResult.ok
    ) {
      unavailableEvidence.push(
        "proxy_evidence"
      );
    }

    multisig =
      dedupeDeterministically(
        multisigResult
          .items
          .map(
            parseMultisig
          )
          .filter(
            (
              item
            ): item is PolkadotMultisigEvidence =>
              item !== null
          ),
        item =>
          deterministicEvidenceIdentity([
            item.multiId,
            item.extrinsicIndex,
            item.timestamp,
            item.account,
            item.multisigAccount,
            item.status,
          ])
      )
        .slice(
          0,
          policy
            .multisigLimit
        );

    if (
      !multisigResult.ok
    ) {
      unavailableEvidence.push(
        "multisig_evidence"
      );
    }
  }

  return {
    ok:
      true,

    providerId:
      indexedProvider ===
        "pubfi"
        ? "polkadot-sidecar-pubfi"
        : indexedProvider ===
            "subscan"
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
            indexedProvider
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
