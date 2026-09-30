import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  normalizeAptosAddress,
} from "../address";

import {
  getAptosAnalysisPolicy,
} from "../policy";

import type {
  AptosFungibleAssetBalance,
  AptosObjectEvidence,
  AptosProviderErrorCode,
  AptosProviderResult,
} from "../types";

type JsonRecord =
  Record<string, unknown>;

export type AptosIndexedEvidence = {
  fungibleAssets:
    readonly AptosFungibleAssetBalance[];

  objects:
    readonly AptosObjectEvidence[];

  coverage: {
    fungibleAssetLimit:
      number;

    objectLimit:
      number;

    fungibleAssetsHaveMore:
      boolean;

    objectsHaveMore:
      boolean;
  };
};

export type AptosIndexerFetch =
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

export type AptosIndexerDependencies = {
  fetchImpl:
    AptosIndexerFetch;

  graphqlUrl:
    string | null;

  apiKey:
    string | null;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  AptosIndexerDependencies = {
    fetchImpl:
      fetch,

    graphqlUrl:
      process.env
        .APTOS_INDEXER_GRAPHQL_URL
        ?.trim() ||
      null,

    apiKey:
      process.env
        .APTOS_INDEXER_API_KEY
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
    Number.isFinite(
      value
    )
  )
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

function providerFailure(
  code:
    AptosProviderErrorCode,
  error:
    string,
  started:
    number
): AptosProviderResult<
  AptosIndexedEvidence
> {
  return {
    ok:
      false,

    providerId:
      "aptos-indexer",

    latencyMs:
      Date.now() -
      started,

    code,

    error,
  };
}

const QUERY = `
query AyzoAptosDeep(
  $owner: String!
  $assetLimit: Int!
  $objectLimit: Int!
) {
  current_fungible_asset_balances(
    where: {
      owner_address: {
        _eq: $owner
      }
      amount: {
        _gt: "0"
      }
    }
    limit: $assetLimit
  ) {
    amount
    asset_type
    storage_id

    metadata {
      asset_type
      name
      symbol
      decimals
    }
  }

  current_objects(
    where: {
      owner_address: {
        _eq: $owner
      }
    }
    limit: $objectLimit
  ) {
    object_address
    owner_address
    state_key_hash
    allow_ungated_transfer
  }
}
`;

export async function getAptosIndexedEvidence(
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
    AptosIndexerDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  AptosProviderResult<
    AptosIndexedEvidence
  >
> {
  const started =
    Date.now();

  const normalized =
    normalizeAptosAddress(
      address
    );

  if (!normalized) {
    return providerFailure(
      "INVALID_ADDRESS",
      "Invalid Aptos address.",
      started
    );
  }

  if (!deps.graphqlUrl) {
    return providerFailure(
      "UPSTREAM_ERROR",
      "Aptos indexed evidence endpoint is not configured.",
      started
    );
  }

  const policy =
    getAptosAnalysisPolicy(
      analysisPlan
    );

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      deps.timeoutMs
    );

  try {
    const headers:
      Record<string, string> = {
        "content-type":
          "application/json",
      };

    if (deps.apiKey) {
      headers[
        "authorization"
      ] =
        `Bearer ${deps.apiKey}`;
    }

    const response =
      await deps.fetchImpl(
        deps.graphqlUrl,
        {
          method:
            "POST",

          headers,

          signal:
            controller.signal,

          body:
            JSON.stringify({
              query:
                QUERY,

              variables: {
                owner:
                  normalized,

                assetLimit:
                  policy
                    .fungibleAssetLimit +
                  1,

                objectLimit:
                  policy
                    .objectLimit +
                  1,
              },
            }),
        }
      );

    if (!response.ok) {
      return providerFailure(
        response.status ===
          429
          ? "RATE_LIMITED"
          : "UPSTREAM_ERROR",

        `Aptos Indexer HTTP ${response.status}.`,

        started
      );
    }

    let body:
      unknown;

    try {
      body =
        await response.json();
    } catch {
      return providerFailure(
        "MALFORMED_RESPONSE",
        "Aptos Indexer returned invalid JSON.",
        started
      );
    }

    const root =
      record(
        body
      );

    if (
      !root ||
      array(
        root.errors
      ).length >
        0
    ) {
      return providerFailure(
        "MALFORMED_RESPONSE",
        "Aptos Indexer response contained errors.",
        started
      );
    }

    const data =
      record(
        root.data
      );

    if (!data) {
      return providerFailure(
        "MALFORMED_RESPONSE",
        "Aptos Indexer response had no data.",
        started
      );
    }

    const rawAssets =
      array(
        data
          .current_fungible_asset_balances
      );

    const rawObjects =
      array(
        data.current_objects
      );

    const fungibleAssets =
      rawAssets
        .map(item => {
          const row =
            record(item);

          if (!row) {
            return null;
          }

          const metadata =
            record(
              row.metadata
            );

          const assetType =
            text(
              row.asset_type
            ) ??
            text(
              metadata
                ?.asset_type
            ) ??
            text(
              row.storage_id
            );

          const amount =
            text(
              row.amount
            );

          if (
            !assetType ||
            !amount
          ) {
            return null;
          }

          return {
            assetType,

            metadataAddress:
              text(
                metadata
                  ?.asset_type
              ) ??
              text(
                row.asset_type
              ),

            amount,

            symbol:
              text(
                metadata?.symbol
              ),

            name:
              text(
                metadata?.name
              ),

            decimals:
              numberValue(
                metadata
                  ?.decimals
              ),
          };
        })
        .filter(
          (
            item
          ): item is AptosFungibleAssetBalance =>
            item !== null
        );

    const objects =
      rawObjects
        .map(item => {
          const row =
            record(item);

          if (!row) {
            return null;
          }

          const objectAddress =
            text(
              row.object_address
            );

          if (!objectAddress) {
            return null;
          }

          return {
            objectAddress,

            ownerAddress:
              text(
                row.owner_address
              ),

            stateKeyHash:
              text(
                row.state_key_hash
              ),
          };
        })
        .filter(
          (
            item
          ): item is AptosObjectEvidence =>
            item !== null
        );

    return {
      ok:
        true,

      providerId:
        "aptos-indexer",

      latencyMs:
        Date.now() -
        started,

      data: {
        fungibleAssets:
          fungibleAssets.slice(
            0,
            policy
              .fungibleAssetLimit
          ),

        objects:
          objects.slice(
            0,
            policy
              .objectLimit
          ),

        coverage: {
          fungibleAssetLimit:
            policy
              .fungibleAssetLimit,

          objectLimit:
            policy
              .objectLimit,

          fungibleAssetsHaveMore:
            fungibleAssets.length >
            policy
              .fungibleAssetLimit,

          objectsHaveMore:
            objects.length >
            policy
              .objectLimit,
        },
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return providerFailure(
        "TIMEOUT",
        "Aptos Indexer request timed out.",
        started
      );
    }

    return providerFailure(
      "UPSTREAM_ERROR",
      "Aptos Indexer request failed.",
      started
    );
  } finally {
    clearTimeout(
      timer
    );
  }
}
