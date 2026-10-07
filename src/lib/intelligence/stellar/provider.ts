import { providerUsageFetch } from "@/lib/providerUsageHttpCore";
import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

import {
  isStellarAccountAddress,
} from "./address";

import {
  getStellarAnalysisPolicy,
} from "./policy";

import type {
  StellarBalanceEvidence,
  StellarEvidence,
  StellarOfferEvidence,
  StellarOperationEvidence,
  StellarPaymentEvidence,
  StellarProviderResult,
  StellarSignerEvidence,
  StellarTradeEvidence,
  StellarTransactionEvidence,
} from "./types";

const DEFAULT_HORIZON_URL =
  "https://horizon.stellar.org";

type JsonRecord =
  Record<string, unknown>;

export type StellarFetch =
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

export type StellarProviderDependencies = {
  fetchImpl:
    StellarFetch;

  baseUrl:
    string;

  timeoutMs:
    number;
};

const DEFAULT_DEPENDENCIES:
  StellarProviderDependencies = {
    fetchImpl:
      fetch,

    baseUrl:
      process.env
        .STELLAR_HORIZON_URL
        ?.trim() ||
      DEFAULT_HORIZON_URL,

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

function booleanValue(
  value:
    unknown
) {
  return typeof value ===
    "boolean"
    ? value
    : null;
}

function records(
  body:
    JsonRecord | null
) {
  return array(
    record(
      body?._embedded
    )?.records
  );
}

function assetLabel(
  value:
    JsonRecord | null
) {
  if (!value) {
    return null;
  }

  const type =
    text(
      value.asset_type
    );

  if (
    type ===
    "native"
  ) {
    return "XLM";
  }

  const code =
    text(
      value.asset_code
    );

  const issuer =
    text(
      value.asset_issuer
    );

  if (!code) {
    return type;
  }

  return issuer
    ? `${code}:${issuer}`
    : code;
}

function parseBalance(
  value:
    unknown
): StellarBalanceEvidence | null {
  const row =
    record(
      value
    );

  const balance =
    text(
      row?.balance
    );

  const assetType =
    text(
      row?.asset_type
    );

  if (
    !balance ||
    !assetType
  ) {
    return null;
  }

  return {
    assetType,

    assetCode:
      text(
        row?.asset_code
      ),

    assetIssuer:
      text(
        row?.asset_issuer
      ),

    balance,

    limit:
      text(
        row?.limit
      ),

    authorized:
      booleanValue(
        row?.is_authorized
      ),

    authorizedToMaintainLiabilities:
      booleanValue(
        row
          ?.is_authorized_to_maintain_liabilities
      ),

    clawbackEnabled:
      booleanValue(
        row
          ?.is_clawback_enabled
      ),
  };
}

function parseSigner(
  value:
    unknown
): StellarSignerEvidence | null {
  const row =
    record(
      value
    );

  const key =
    text(
      row?.key
    );

  const type =
    text(
      row?.type
    );

  const weight =
    numberValue(
      row?.weight
    );

  if (
    !key ||
    !type ||
    weight === null
  ) {
    return null;
  }

  return {
    key,
    type,
    weight,
  };
}

function parseTransaction(
  value:
    unknown
): StellarTransactionEvidence | null {
  const row =
    record(
      value
    );

  const hash =
    text(
      row?.hash
    );

  if (!hash) {
    return null;
  }

  return {
    hash,

    ledger:
      numberValue(
        row?.ledger
      ),

    createdAt:
      text(
        row?.created_at
      ),

    sourceAccount:
      text(
        row
          ?.source_account
      ),

    feeCharged:
      text(
        row
          ?.fee_charged
      ),

    operationCount:
      numberValue(
        row
          ?.operation_count
      ),

    successful:
      booleanValue(
        row?.successful
      ),
  };
}

function parsePayment(
  value:
    unknown
): StellarPaymentEvidence | null {
  const row =
    record(
      value
    );

  const id =
    text(
      row?.id
    );

  const type =
    text(
      row?.type
    );

  if (
    !id ||
    !type
  ) {
    return null;
  }

  return {
    id,
    type,

    transactionHash:
      text(
        row
          ?.transaction_hash
      ),

    createdAt:
      text(
        row?.created_at
      ),

    source:
      text(
        row?.from
      ) ??
      text(
        row
          ?.source_account
      ),

    destination:
      text(
        row?.to
      ),

    funder:
      text(
        row?.funder
      ),

    createdAccount:
      text(
        row?.account
      ),

    amount:
      text(
        row?.amount
      ),

    startingBalance:
      text(
        row
          ?.starting_balance
      ),

    assetType:
      text(
        row?.asset_type
      ),

    assetCode:
      text(
        row?.asset_code
      ),

    assetIssuer:
      text(
        row
          ?.asset_issuer
      ),
  };
}

function parseOperation(
  value:
    unknown
): StellarOperationEvidence | null {
  const row =
    record(
      value
    );

  const id =
    text(
      row?.id
    );

  const type =
    text(
      row?.type
    );

  if (
    !id ||
    !type
  ) {
    return null;
  }

  return {
    id,
    type,

    transactionHash:
      text(
        row
          ?.transaction_hash
      ),

    createdAt:
      text(
        row?.created_at
      ),

    sourceAccount:
      text(
        row
          ?.source_account
      ),
  };
}

function parseOffer(
  value:
    unknown
): StellarOfferEvidence | null {
  const row =
    record(
      value
    );

  const id =
    text(
      row?.id
    );

  if (!id) {
    return null;
  }

  return {
    id,

    seller:
      text(
        row?.seller
      ),

    amount:
      text(
        row?.amount
      ),

    price:
      text(
        row?.price
      ),

    buying:
      assetLabel(
        record(
          row?.buying
        )
      ),

    selling:
      assetLabel(
        record(
          row?.selling
        )
      ),
  };
}

function parseTrade(
  value:
    unknown
): StellarTradeEvidence | null {
  const row =
    record(
      value
    );

  const id =
    text(
      row?.id
    );

  if (!id) {
    return null;
  }

  const base =
    record(
      row?.base
    );

  const counter =
    record(
      row?.counter
    );

  return {
    id,

    ledgerCloseTime:
      text(
        row
          ?.ledger_close_time
      ),

    baseAccount:
      text(
        row
          ?.base_account
      ),

    counterAccount:
      text(
        row
          ?.counter_account
      ),

    baseAmount:
      text(
        row
          ?.base_amount
      ),

    counterAmount:
      text(
        row
          ?.counter_amount
      ),

    baseAsset:
      assetLabel(
        base
      ),

    counterAsset:
      assetLabel(
        counter
      ),
  };
}

function errorCode(
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

export async function getStellarEvidence(
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
    StellarProviderDependencies =
      DEFAULT_DEPENDENCIES
): Promise<
  StellarProviderResult
> {
  const normalized =
    address
      .trim()
      .toUpperCase();

  if (
    !isStellarAccountAddress(
      normalized
    )
  ) {
    return {
      ok:
        false,

      providerId:
        "stellar-horizon",

      latencyMs:
        null,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Stellar account address.",
    };
  }

  const policy =
    getStellarAnalysisPolicy(
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

  async function request(
    path:
      string
  ) {
    const response =
      await providerUsageFetch({ provider: "stellar-horizon", operation: "stellar.horizon" }, `${deps.baseUrl}${path}`, () => deps.fetchImpl(
        `${deps.baseUrl}${path}`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache:
            "no-store",

          signal:
            controller.signal,
        }
      ));

    if (
      response.status ===
        404
    ) {
      throw Object.assign(
        new Error(
          "NOT_FOUND"
        ),
        {
          code:
            "NOT_FOUND",
        }
      );
    }

    if (
      response.status ===
        429
    ) {
      throw Object.assign(
        new Error(
          "RATE_LIMITED"
        ),
        {
          code:
            "RATE_LIMITED",
        }
      );
    }

    if (!response.ok) {
      throw new Error(
        `Horizon HTTP ${response.status}`
      );
    }

    return record(
      await response.json()
    );
  }

  try {
    const encoded =
      encodeURIComponent(
        normalized
      );

    const [
      accountBody,
      transactionBody,
      paymentBody,
      earliestPaymentBody,
      operationBody,
      offerBody,
      tradeBody,
    ] =
      await Promise.all([
        request(
          `/accounts/${encoded}`
        ),

        request(
          `/accounts/${encoded}/transactions?limit=${policy.transactionLimit}&order=desc`
        ),

        request(
          `/accounts/${encoded}/payments?limit=${policy.paymentLimit}&order=desc`
        ),

        request(
          `/accounts/${encoded}/payments?limit=${policy.earliestPaymentLimit}&order=asc`
        ),

        request(
          `/accounts/${encoded}/operations?limit=${policy.operationLimit}&order=desc`
        ),

        request(
          `/accounts/${encoded}/offers?limit=${policy.offerLimit}&order=desc`
        ),

        request(
          `/accounts/${encoded}/trades?limit=${policy.tradeLimit}&order=desc`
        ),
      ]);

    if (!accountBody) {
      throw new Error(
        "Missing Horizon account response."
      );
    }

    const thresholds =
      record(
        accountBody
          .thresholds
      );

    const flags =
      record(
        accountBody.flags
      );

    const balances =
      array(
        accountBody
          .balances
      )
        .map(
          parseBalance
        )
        .filter(
          (
            item
          ): item is
            StellarBalanceEvidence =>
              item !== null
        );

    const signers =
      array(
        accountBody
          .signers
      )
        .map(
          parseSigner
        )
        .filter(
          (
            item
          ): item is
            StellarSignerEvidence =>
              item !== null
        );

    const data:
      StellarEvidence = {
        account: {
          id:
            text(
              accountBody
                .account_id
            ) ??
            normalized,

          sequence:
            text(
              accountBody
                .sequence
            ),

          subentryCount:
            numberValue(
              accountBody
                .subentry_count
            ),

          inflationDestination:
            text(
              accountBody
                .inflation_destination
            ),

          homeDomain:
            text(
              accountBody
                .home_domain
            ),

          lastModifiedLedger:
            numberValue(
              accountBody
                .last_modified_ledger
            ),

          lastModifiedTime:
            text(
              accountBody
                .last_modified_time
            ),

          thresholds: {
            low:
              numberValue(
                thresholds
                  ?.low_threshold
              ),

            medium:
              numberValue(
                thresholds
                  ?.med_threshold
              ),

            high:
              numberValue(
                thresholds
                  ?.high_threshold
              ),
          },

          flags: {
            authRequired:
              booleanValue(
                flags
                  ?.auth_required
              ),

            authRevocable:
              booleanValue(
                flags
                  ?.auth_revocable
              ),

            authImmutable:
              booleanValue(
                flags
                  ?.auth_immutable
              ),

            authClawbackEnabled:
              booleanValue(
                flags
                  ?.auth_clawback_enabled
              ),
          },

          balances,
          signers,
        },

        transactions:
          records(
            transactionBody
          )
            .map(
              parseTransaction
            )
            .filter(
              (
                item
              ): item is
                StellarTransactionEvidence =>
                  item !== null
            ),

        payments:
          records(
            paymentBody
          )
            .map(
              parsePayment
            )
            .filter(
              (
                item
              ): item is
                StellarPaymentEvidence =>
                  item !== null
            ),

        earliestPayments:
          records(
            earliestPaymentBody
          )
            .map(
              parsePayment
            )
            .filter(
              (
                item
              ): item is
                StellarPaymentEvidence =>
                  item !== null
            ),

        operations:
          records(
            operationBody
          )
            .map(
              parseOperation
            )
            .filter(
              (
                item
              ): item is
                StellarOperationEvidence =>
                  item !== null
            ),

        offers:
          records(
            offerBody
          )
            .map(
              parseOffer
            )
            .filter(
              (
                item
              ): item is
                StellarOfferEvidence =>
                  item !== null
            ),

        trades:
          records(
            tradeBody
          )
            .map(
              parseTrade
            )
            .filter(
              (
                item
              ): item is
                StellarTradeEvidence =>
                  item !== null
            ),

        coverage: {
          plan:
            analysisPlan,

          transactionLimit:
            policy
              .transactionLimit,

          paymentLimit:
            policy
              .paymentLimit,

          earliestPaymentLimit:
            policy
              .earliestPaymentLimit,

          operationLimit:
            policy
              .operationLimit,

          offerLimit:
            policy
              .offerLimit,

          tradeLimit:
            policy
              .tradeLimit,

          provider:
            "stellar-horizon",
        },
      };

    return {
      ok:
        true,

      providerId:
        "stellar-horizon",

      latencyMs:
        Date.now() -
        started,

      data,
    };
  } catch (
    error
  ) {
    const explicit =
      (
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error
      )
        ? (
            error as {
              code?:
                unknown;
            }
          ).code
        : null;

    const code =
      explicit ===
        "NOT_FOUND"
        ? "NOT_FOUND" as const
        : explicit ===
            "RATE_LIMITED"
          ? "RATE_LIMITED" as const
          : errorCode(
              error
            );

    return {
      ok:
        false,

      providerId:
        "stellar-horizon",

      latencyMs:
        Date.now() -
        started,

      code,

      error:
        code ===
          "NOT_FOUND"
          ? "Stellar account was not found."
          : code ===
              "RATE_LIMITED"
            ? "Stellar Horizon rate limit reached."
            : code ===
                "TIMEOUT"
              ? "Stellar Horizon request timed out."
              : "Stellar Horizon request failed.",
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export const STELLAR_MAINNET_HORIZON =
  DEFAULT_HORIZON_URL;
