import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeSuiAddress,
} from "./address";

import {
  getSuiAnalysisPolicy,
} from "./policy";

import type {
  SuiAccountEvidence,
  SuiBalanceChangeEvidence,
  SuiCoinBalanceEvidence,
  SuiObjectChangeEvidence,
  SuiObservedTransaction,
  SuiOwnedObjectEvidence,
  SuiProviderResult,
  SuiSubjectObjectEvidence,
} from "./types";

const DEFAULT_SUI_GRAPHQL_URL =
  "https://graphql.mainnet.sui.io/graphql";

const SUI_COIN_TYPE =
  "0x2::sui::SUI";

const QUERY = `
query AyzoSuiIntelligence(
  $address: SuiAddress!
  $historyLimit: Int!
  $earliestHistoryLimit: Int!
  $balanceLimit: Int!
  $objectLimit: Int!
) {
  chainIdentifier

  subject: address(
    address: $address
  ) {
    address

    balance(
      coinType: "0x2::sui::SUI"
    ) {
      totalBalance
      coinBalance
      addressBalance
    }

    balances(
      first: $balanceLimit
    ) {
      nodes {
        coinType {
          repr
        }

        totalBalance
        coinBalance
        addressBalance

      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }

    objects(
      first: $objectLimit
    ) {
      nodes {
        address
        version
        digest
        hasPublicTransfer

        contents {
          type {
            repr
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }

    recentTransactions:
      transactions(
        last: $historyLimit
        relation: AFFECTED
      ) {
        nodes {
          digest

          sender {
            address
          }

          effects {
            status
            timestamp

            balanceChanges(
              first: 50
            ) {
              nodes {
                amount

                coinType {
                  repr
                }

                owner {
                  address
                }
              }
            }

            objectChanges(
              first: 20
            ) {
              nodes {
                address
                idCreated
                idDeleted
              }
            }
          }
        }

        pageInfo {
          hasPreviousPage
          startCursor
        }
      }

    earliestTransactions:
      transactions(
        first: $earliestHistoryLimit
        relation: AFFECTED
      ) {
        nodes {
          digest

          sender {
            address
          }

          effects {
            status
            timestamp

            balanceChanges(
              first: 50
            ) {
              nodes {
                amount

                coinType {
                  repr
                }

                owner {
                  address
                }
              }
            }

            objectChanges(
              first: 20
            ) {
              nodes {
                address
                idCreated
                idDeleted
              }
            }
          }
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
  }

  subjectObject:
    object(
      address: $address
    ) {
      address
      version
      digest

      asMoveObject {
        hasPublicTransfer

        contents {
          type {
            repr
          }
        }
      }

      asMovePackage {
        address
      }
    }
}
`;

type JsonRecord =
  Record<string, unknown>;

export type SuiFetch =
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

export type SuiProviderDependencies = {
  fetchImpl:
    SuiFetch;

  graphqlUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  SuiProviderDependencies = {
    fetchImpl:
      fetch,

    graphqlUrl:
      process.env
        .SUI_GRAPHQL_URL
        ?.trim() ||
      DEFAULT_SUI_GRAPHQL_URL,

    timeoutMs:
      12_000,
  };

function record(
  value: unknown
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
  value: unknown
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function stringValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function numberValue(
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

function booleanValue(
  value: unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function nodes(
  connection:
    unknown
) {
  return array(
    record(
      connection
    )?.nodes
  );
}

function pageInfo(
  connection:
    unknown
) {
  return record(
    record(
      connection
    )?.pageInfo
  );
}

function readBalance(
  value:
    unknown
): SuiCoinBalanceEvidence | null {
  const row =
    record(
      value
    );

  const coinType =
    stringValue(
      record(
        row?.coinType
      )?.repr
    );

  const totalBalance =
    stringValue(
      row?.totalBalance
    );

  if (
    !coinType ||
    totalBalance ===
      null
  ) {
    return null;
  }

  /*
   * Balance does not expose coin metadata inline
   * in the current Sui GraphQL schema.
   *
   * Native SUI metadata is protocol-known.
   * Other coin types remain explicitly unknown
   * instead of inventing metadata.
   */
  const nativeSui =
    coinType ===
      SUI_COIN_TYPE;

  return {
    coinType,

    totalBalance,

    coinBalance:
      stringValue(
        row?.coinBalance
      ),

    addressBalance:
      stringValue(
        row?.addressBalance
      ),

    symbol:
      nativeSui
        ? "SUI"
        : null,

    name:
      nativeSui
        ? "Sui"
        : null,

    decimals:
      nativeSui
        ? 9
        : null,
  };
}

function readObject(
  value:
    unknown
): SuiOwnedObjectEvidence | null {
  const row =
    record(
      value
    );

  const objectId =
    stringValue(
      row?.address
    );

  if (!objectId) {
    return null;
  }

  return {
    objectId,

    version:
      numberValue(
        row?.version
      ),

    digest:
      stringValue(
        row?.digest
      ),

    type:
      stringValue(
        record(
          record(
            row?.contents
          )?.type
        )?.repr
      ),

    hasPublicTransfer:
      booleanValue(
        row?.hasPublicTransfer
      ),
  };
}

function readBalanceChange(
  value:
    unknown
): SuiBalanceChangeEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  return {
    owner:
      stringValue(
        record(
          row.owner
        )?.address
      ),

    coinType:
      stringValue(
        record(
          row.coinType
        )?.repr
      ),

    amount:
      stringValue(
        row.amount
      ),
  };
}

function readObjectChange(
  value:
    unknown
): SuiObjectChangeEvidence | null {
  const row =
    record(
      value
    );

  const objectId =
    stringValue(
      row?.address
    );

  if (!objectId) {
    return null;
  }

  return {
    objectId,

    idCreated:
      booleanValue(
        row?.idCreated
      ) ??
      false,

    idDeleted:
      booleanValue(
        row?.idDeleted
      ) ??
      false,
  };
}

function readTransaction(
  value:
    unknown
): SuiObservedTransaction | null {
  const row =
    record(
      value
    );

  const transactionHash =
    stringValue(
      row?.digest
    );

  if (!transactionHash) {
    return null;
  }

  const effects =
    record(
      row?.effects
    );

  const balanceChanges =
    nodes(
      effects
        ?.balanceChanges
    )
      .map(
        readBalanceChange
      )
      .filter(
        (
          item
        ): item is
          SuiBalanceChangeEvidence =>
            item !== null
      );

  const objectChanges =
    nodes(
      effects
        ?.objectChanges
    )
      .map(
        readObjectChange
      )
      .filter(
        (
          item
        ): item is
          SuiObjectChangeEvidence =>
            item !== null
      );

  return {
    transactionHash,

    sender:
      stringValue(
        record(
          row?.sender
        )?.address
      ),

    timestamp:
      stringValue(
        effects?.timestamp
      ),

    status:
      stringValue(
        effects?.status
      ),

    balanceChanges,

    objectChanges,
  };
}

function readSubjectObject(
  value:
    unknown
): SuiSubjectObjectEvidence {
  const row =
    record(
      value
    );

  if (!row) {
    return {
      exists:
        false,

      kind:
        null,

      objectId:
        null,

      version:
        null,

      digest:
        null,

      type:
        null,

      hasPublicTransfer:
        null,
    };
  }

  const moveObject =
    record(
      row.asMoveObject
    );

  const movePackage =
    record(
      row.asMovePackage
    );

  return {
    exists:
      true,

    kind:
      movePackage
        ? "package"
        : moveObject
          ? "move_object"
          : "object",

    objectId:
      stringValue(
        row.address
      ),

    version:
      numberValue(
        row.version
      ),

    digest:
      stringValue(
        row.digest
      ),

    type:
      stringValue(
        record(
          record(
            moveObject
              ?.contents
          )?.type
        )?.repr
      ),

    hasPublicTransfer:
      booleanValue(
        moveObject
          ?.hasPublicTransfer
      ),
  };
}

function parseErrorCode(
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

export async function getSuiAccountEvidence(
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
    SuiProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  SuiProviderResult<
    SuiAccountEvidence
  >
> {
  const normalized =
    normalizeSuiAddress(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId:
        "sui-graphql",

      latencyMs:
        null,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Sui address.",
    };
  }

  const policy =
    getSuiAnalysisPolicy(
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

  try {
    const response =
      await deps.fetchImpl(
        deps.graphqlUrl,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          cache:
            "no-store",

          signal:
            controller.signal,

          body:
            JSON.stringify({
              query:
                QUERY,

              variables: {
                address:
                  normalized,

                historyLimit:
                  policy.historyLimit,

                earliestHistoryLimit:
                  policy
                    .earliestHistoryLimit,

                balanceLimit:
                  policy.balanceLimit,

                objectLimit:
                  policy.objectLimit,
              },
            }),
        }
      );

    const latencyMs =
      Date.now() -
      started;

    if (
      response.status ===
        429
    ) {
      return {
        ok:
          false,

        providerId:
          "sui-graphql",

        latencyMs,

        code:
          "RATE_LIMITED",

        error:
          "Sui GraphQL rate limit reached.",
      };
    }

    if (!response.ok) {
      return {
        ok:
          false,

        providerId:
          "sui-graphql",

        latencyMs,

        code:
          "UPSTREAM_ERROR",

        error:
          "Sui GraphQL request failed.",
      };
    }

    const body =
      record(
        await response.json()
      );

    const errors =
      array(
        body?.errors
      );

    if (
      errors.length >
      0
    ) {
      return {
        ok:
          false,

        providerId:
          "sui-graphql",

        latencyMs,

        code:
          "UPSTREAM_ERROR",

        error:
          "Sui GraphQL returned query errors.",
      };
    }

    const data =
      record(
        body?.data
      );

    const subject =
      record(
        data?.subject
      );

    const balancesConnection =
      subject
        ?.balances;

    const objectsConnection =
      subject
        ?.objects;

    const recentConnection =
      subject
        ?.recentTransactions;

    const earliestConnection =
      subject
        ?.earliestTransactions;

    const suiBalance =
      record(
        subject?.balance
      );

    const balances =
      nodes(
        balancesConnection
      )
        .map(
          readBalance
        )
        .filter(
          (
            item
          ): item is
            SuiCoinBalanceEvidence =>
              item !== null
        );

    const ownedObjects =
      nodes(
        objectsConnection
      )
        .map(
          readObject
        )
        .filter(
          (
            item
          ): item is
            SuiOwnedObjectEvidence =>
              item !== null
        );

    const transactions =
      nodes(
        recentConnection
      )
        .map(
          readTransaction
        )
        .filter(
          (
            item
          ): item is
            SuiObservedTransaction =>
              item !== null
        );

    const earliestTransactions =
      nodes(
        earliestConnection
      )
        .map(
          readTransaction
        )
        .filter(
          (
            item
          ): item is
            SuiObservedTransaction =>
              item !== null
        );

    return {
      ok:
        true,

      providerId:
        "sui-graphql",

      latencyMs,

      data: {
        chainIdentifier:
          stringValue(
            data
              ?.chainIdentifier
          ),

        address:
          stringValue(
            subject
              ?.address
          ) ??
          normalized,

        suiBalanceMist:
          stringValue(
            suiBalance
              ?.totalBalance
          ) ??
          "0",

        balances,

        ownedObjects,

        transactions,

        earliestTransactions,

        subjectObject:
          readSubjectObject(
            data
              ?.subjectObject
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

          balanceLimit:
            policy
              .balanceLimit,

          objectLimit:
            policy
              .objectLimit,

          historyHasMore:
            booleanValue(
              pageInfo(
                recentConnection
              )
                ?.hasPreviousPage
            ) ??
            false,

          earliestHistoryHasMore:
            booleanValue(
              pageInfo(
                earliestConnection
              )
                ?.hasNextPage
            ) ??
            false,

          balancesHaveMore:
            booleanValue(
              pageInfo(
                balancesConnection
              )
                ?.hasNextPage
            ) ??
            false,

          objectsHaveMore:
            booleanValue(
              pageInfo(
                objectsConnection
              )
                ?.hasNextPage
            ) ??
            false,
        },
      },
    };
  } catch (
    error
  ) {
    return {
      ok:
        false,

      providerId:
        "sui-graphql",

      latencyMs:
        Date.now() -
        started,

      code:
        parseErrorCode(
          error
        ),

      error:
        parseErrorCode(
          error
        ) ===
          "TIMEOUT"
          ? "Sui GraphQL request timed out."
          : "Sui GraphQL request failed.",
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export const SUI_NATIVE_COIN_TYPE =
  SUI_COIN_TYPE;

export const SUI_MAINNET_GRAPHQL =
  DEFAULT_SUI_GRAPHQL_URL;
