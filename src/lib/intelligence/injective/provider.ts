import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  loadCosmosSdkEvidence,
  type CosmosSdkProviderResult,
} from "@/lib/intelligence/cosmosSdk";

import {
  normalizeInjectiveAddress,
} from "./address";

import {
  getInjectiveIndexedHistory,
  type InjectiveIndexedHistoryDependencies,
  type InjectiveIndexedHistoryResult,
} from "./indexer";

const DEFAULT_REST =
  "https://sentry.lcd.injective.network";

const DEFAULT_REST_FALLBACK =
  "https://injective-api.polkachu.com";

function unique(
  values:
    readonly (
      string |
      undefined
    )[]
) {
  return [
    ...new Set(
      values
        .map(
          item =>
            item?.trim()
        )
        .filter(
          (
            item
          ): item is string =>
            Boolean(item)
        )
    ),
  ];
}

export async function getInjectiveEvidence(
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
      NonNullable<
        Parameters<
          typeof loadCosmosSdkEvidence
        >[1]
      >["fetchImpl"];

    timeoutMs?:
      number;

    baseUrls?:
      readonly string[];

    loadIndexedHistory?:
      (
        input: {
          address:
            string;

          analysisPlan:
            AnalysisDepthPlan;
        },
        deps?:
          InjectiveIndexedHistoryDependencies
      ) => Promise<
        InjectiveIndexedHistoryResult
      >;

    indexedHistoryDeps?:
      InjectiveIndexedHistoryDependencies;
  } = {}
): Promise<
  CosmosSdkProviderResult
> {
  const started =
    Date.now();

  const stateResult =
    await loadCosmosSdkEvidence(
      {
        network:
          "injective",

        address,
        analysisPlan,

        validator:
          normalizeInjectiveAddress,

        providerId:
          "injective-chain-rest",

        baseUrls:
          deps.baseUrls ??
          unique([
            process.env
              .INJECTIVE_REST_URL,

            DEFAULT_REST,

            process.env
              .INJECTIVE_REST_FALLBACK_URL,

            DEFAULT_REST_FALLBACK,
          ]),

        /*
         * Injective historical transaction evidence is
         * intentionally sourced from the Explorer/Indexer,
         * not from the Chain REST state API.
         */
        includeTransactionHistory:
          false,
      },
      {
        fetchImpl:
          deps.fetchImpl,

        timeoutMs:
          deps.timeoutMs,
      }
    );

  if (!stateResult.ok) {
    return stateResult;
  }

  const loadIndexedHistory =
    deps.loadIndexedHistory ??
    getInjectiveIndexedHistory;

  const historyResult =
    await loadIndexedHistory(
      {
        address:
          stateResult
            .data
            .address,

        analysisPlan,
      },
      deps.indexedHistoryDeps ??
      {
        fetchImpl:
          deps.fetchImpl,

        timeoutMs:
          deps.timeoutMs,
      }
    );

  const unavailable =
    stateResult
      .data
      .coverage
      .unavailableEvidence
      .filter(
        item =>
          item !==
            "transaction_history"
      );

  if (!historyResult.ok) {
    unavailable.push(
      "transaction_history"
    );
  }

  const providerRequestsUsed =
    stateResult
      .data
      .coverage
      .providerRequestsUsed +
    (
      historyResult.ok
        ? historyResult
            .data
            .coverage
            .providerRequestsUsed
        : historyResult
            .providerRequestsUsed
    );

  const transportFailoverUsed =
    stateResult
      .data
      .coverage
      .transportFailoverUsed ||
    (
      historyResult.ok &&
      historyResult
        .data
        .coverage
        .transportFailoverUsed
    );

  const uniqueUnavailable =
    [
      ...new Set(
        unavailable
      ),
    ];

  return {
    ok:
      true,

    providerId:
      historyResult.ok
        ? `injective-chain-rest+${historyResult.providerId}`
        : "injective-chain-rest",

    latencyMs:
      Date.now() -
      started,

    data: {
      ...stateResult.data,

      transactions:
        historyResult.ok
          ? historyResult
              .data
              .transactions
          : [],

      coverage: {
        ...stateResult
          .data
          .coverage,

        providerRequestsUsed,

        transportFailoverUsed,

        unavailableEvidence:
          uniqueUnavailable,

        coverage:
          uniqueUnavailable
            .length >
            0
            ? "partial"
            : "complete",
      },
    },
  };
}
