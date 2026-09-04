import type {
  ActivityTimeline,
} from "@/lib/intelligence/activityTimeline";

export type WalletTrackRecordStatus =
  | "limited"
  | "unavailable";

export type WalletTrackRecordMetric = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
  evidenceState: "SUPPORTED";
};

export type WalletTrackRecord = {
  status: WalletTrackRecordStatus;

  firstObservedAt:
    string | null;

  lastObservedAt:
    string | null;

  observedSpanDays:
    number | null;

  metrics:
    readonly WalletTrackRecordMetric[];

  limitation:
    string;

  methodology:
    string;

  evidenceState:
    "SUPPORTED";
};

type Range = {
  first:
    string | null;

  last:
    string | null;
};

function validTime(
  value:
    string | null | undefined
) {
  if (!value) {
    return null;
  }

  const ms =
    Date.parse(value);

  return Number.isFinite(ms)
    ? {
        value,
        ms,
      }
    : null;
}

function observedRange(
  timeline:
    ActivityTimeline
): Range {
  const times =
    timeline.events
      .map(
        event =>
          validTime(
            event.timestamp
          )
      )
      .filter(
        (
          value
        ): value is {
          value: string;
          ms: number;
        } =>
          value !== null
      )
      .sort(
        (
          left,
          right
        ) =>
          left.ms -
          right.ms
      );

  return {
    first:
      times[0]
        ?.value ??
      null,

    last:
      times[
        times.length -
        1
      ]?.value ??
      null,
  };
}

function mergeRange(
  ranges:
    readonly Range[]
): Range {
  const firstCandidates =
    ranges
      .map(
        range =>
          validTime(
            range.first
          )
      )
      .filter(
        (
          value
        ): value is {
          value: string;
          ms: number;
        } =>
          value !== null
      )
      .sort(
        (
          left,
          right
        ) =>
          left.ms -
          right.ms
      );

  const lastCandidates =
    ranges
      .map(
        range =>
          validTime(
            range.last
          )
      )
      .filter(
        (
          value
        ): value is {
          value: string;
          ms: number;
        } =>
          value !== null
      )
      .sort(
        (
          left,
          right
        ) =>
          right.ms -
          left.ms
      );

  return {
    first:
      firstCandidates[0]
        ?.value ??
      null,

    last:
      lastCandidates[0]
        ?.value ??
      null,
  };
}

function spanDays(
  range:
    Range
) {
  const first =
    validTime(
      range.first
    );

  const last =
    validTime(
      range.last
    );

  if (
    !first ||
    !last
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (
        last.ms -
        first.ms
      ) /
        86_400_000
    )
  );
}

function metric(
  id:
    string,
  label:
    string,
  value:
    string | number,
  detail:
    string | null =
      null
): WalletTrackRecordMetric {
  return {
    id,
    label,
    value:
      String(value),
    detail,
    evidenceState:
      "SUPPORTED",
  };
}

function timelineFacts(
  timeline:
    ActivityTimeline
) {
  const hashes =
    new Set(
      timeline.events.map(
        event =>
          event.transactionHash
      )
    );

  const counterparties =
    new Set(
      timeline.events
        .map(
          event =>
            event.counterparty
              ?.toLowerCase() ??
            null
        )
        .filter(
          (
            value
          ): value is string =>
            value !== null
        )
    );

  const assets =
    new Set(
      timeline.events
        .map(
          event =>
            event.assetAddress
              ?.toLowerCase() ??
            event.asset ??
            null
        )
        .filter(
          (
            value
          ): value is string =>
            value !== null
        )
    );

  return {
    eventCount:
      timeline.events.length,

    transactionCount:
      hashes.size,

    counterpartyCount:
      counterparties.size,

    assetCount:
      assets.size,

    incomingCount:
      timeline.events.filter(
        event =>
          event.direction ===
          "incoming"
      ).length,

    outgoingCount:
      timeline.events.filter(
        event =>
          event.direction ===
          "outgoing"
      ).length,

    tokenTransferCount:
      timeline.events.filter(
        event =>
          event.kind ===
          "token_transfer"
      ).length,

    fundingTransferCount:
      timeline.events.filter(
        event =>
          event.kind ===
          "funding_transfer"
      ).length,
  };
}


/* =================================================
   EVM
================================================= */

type EvmTrackRecordInput = {
  timeline:
    ActivityTimeline;

  relationships:
    | {
        counterpartyCount:
          number;

        interactionCount:
          number;

        transactionCount:
          number;

        transferCount:
          number;

        firstSeen?:
          string | null;

        lastSeen?:
          string | null;
      }
    | null;

  funding:
    | {
        fundingSourceCount:
          number;

        repeatedFundingSourceCount:
          number;

        firstSeen?:
          string | null;

        lastSeen?:
          string | null;
      }
    | null;
};

export function buildEvmWalletTrackRecord(
  input:
    EvmTrackRecordInput
): WalletTrackRecord {
  const facts =
    timelineFacts(
      input.timeline
    );

  const range =
    mergeRange([
      observedRange(
        input.timeline
      ),

      {
        first:
          input.relationships
            ?.firstSeen ??
          null,

        last:
          input.relationships
            ?.lastSeen ??
          null,
      },

      {
        first:
          input.funding
            ?.firstSeen ??
          null,

        last:
          input.funding
            ?.lastSeen ??
          null,
      },
    ]);

  const metrics:
    WalletTrackRecordMetric[] = [
      metric(
        "observed-transactions",
        "Observed transactions",
        Math.max(
          facts.transactionCount,
          input.relationships
            ?.transactionCount ??
          0
        ),
        "Deduplicated transaction evidence in the bounded analysis window."
      ),

      metric(
        "counterparties",
        "Counterparties",
        input.relationships
          ?.counterpartyCount ??
        facts.counterpartyCount,
        "Observed direct counterparties only."
      ),

      metric(
        "interactions",
        "Interactions",
        input.relationships
          ?.interactionCount ??
        facts.eventCount,
        "Observed transaction and transfer interactions."
      ),

      metric(
        "token-transfers",
        "Token transfers",
        input.relationships
          ?.transferCount ??
        facts.tokenTransferCount
      ),

      metric(
        "funding-sources",
        "Funding sources",
        input.funding
          ?.fundingSourceCount ??
        0,
        "Observed incoming funding sources; not ultimate origin."
      ),

      metric(
        "repeated-funding",
        "Repeated funding",
        input.funding
          ?.repeatedFundingSourceCount ??
        0,
        "Sources with repeated observed funding evidence."
      ),

      metric(
        "incoming-events",
        "Incoming activity",
        facts.incomingCount
      ),

      metric(
        "outgoing-events",
        "Outgoing activity",
        facts.outgoingCount
      ),
    ];

  const evidenceAvailable =
    facts.eventCount >
      0 ||
    input.relationships !==
      null ||
    input.funding !==
      null;

  return {
    status:
      evidenceAvailable
        ? "limited"
        : "unavailable",

    firstObservedAt:
      range.first,

    lastObservedAt:
      range.last,

    observedSpanDays:
      spanDays(
        range
      ),

    metrics,

    limitation:
      "Track Record is bounded to the transaction, transfer, relationship and funding evidence collected for this AYZO analysis. It is not an exhaustive wallet history.",

    methodology:
      "AYZO reports observed activity only. Track Record does not estimate profitability, trading skill, win rate, identity, ownership or future performance.",

    evidenceState:
      "SUPPORTED",
  };
}


/* =================================================
   SOLANA
================================================= */

type SolanaTrackRecordInput = {
  timeline:
    ActivityTimeline;

  relationships:
    | {
        walletsAnalyzed:
          number;

        sharedTransactionsDetected:
          number;

        relationshipsDetected:
          number;

        relations:
          readonly {
            directSolTransferCount:
              number;
          }[];
      }
    | null;

  funding:
    | {
        walletsAnalyzed:
          number;

        incomingTransfersDetected:
          number;

        sharedFundingSourcesDetected:
          number;

        perWallet:
          readonly {
            recentIncomingTransfers:
              readonly {
                source:
                  string;
              }[];
          }[];
      }
    | null;
};

export function buildSolanaWalletTrackRecord(
  input:
    SolanaTrackRecordInput
): WalletTrackRecord {
  const facts =
    timelineFacts(
      input.timeline
    );

  const range =
    observedRange(
      input.timeline
    );

  const uniqueFundingSources =
    new Set(
      (
        input.funding
          ?.perWallet ??
        []
      ).flatMap(
        wallet =>
          wallet
            .recentIncomingTransfers
            .map(
              transfer =>
                transfer.source
            )
      )
    );

  const directRelationships =
    input.relationships
      ?.relations
      .filter(
        relation =>
          relation
            .directSolTransferCount >
          0
      )
      .length ??
    0;

  const walletsAnalyzed =
    Math.max(
      input.relationships
        ?.walletsAnalyzed ??
      0,

      input.funding
        ?.walletsAnalyzed ??
      0
    );

  const metrics = [
    metric(
      "wallets-analyzed",
      "Wallets analyzed",
      walletsAnalyzed,
      "Current bounded holder-wallet investigation set."
    ),

    metric(
      "relationships",
      "Relationships",
      input.relationships
        ?.relationshipsDetected ??
      0,
      "Observed direct interaction or transaction co-occurrence."
    ),

    metric(
      "direct-relations",
      "Direct interactions",
      directRelationships,
      "Relationships with observed direct SOL transfer evidence."
    ),

    metric(
      "shared-transactions",
      "Shared transactions",
      input.relationships
        ?.sharedTransactionsDetected ??
      0,
      "Transaction co-occurrence; not ownership evidence."
    ),

    metric(
      "incoming-funding",
      "Incoming funding",
      input.funding
        ?.incomingTransfersDetected ??
      facts.fundingTransferCount,
      "Recent direct SOL funding observations."
    ),

    metric(
      "funding-sources",
      "Funding sources",
      uniqueFundingSources.size,
      "Unique recent observed source addresses."
    ),

    metric(
      "shared-funding",
      "Shared funding sources",
      input.funding
        ?.sharedFundingSourcesDetected ??
      0,
      "A shared source does not prove common ownership."
    ),
  ];

  const evidenceAvailable =
    input.relationships !==
      null ||
    input.funding !==
      null ||
    facts.eventCount >
      0;

  return {
    status:
      evidenceAvailable
        ? "limited"
        : "unavailable",

    firstObservedAt:
      range.first,

    lastObservedAt:
      range.last,

    observedSpanDays:
      spanDays(
        range
      ),

    metrics,

    limitation:
      "Solana Track Record summarizes the bounded analyzed holder-wallet set and recent relationship/funding evidence. It is not a complete lifetime history for every holder.",

    methodology:
      "Direct transfers, shared transactions and funding observations are descriptive on-chain evidence. AYZO does not infer common ownership, identity, profitability or trading skill from them.",

    evidenceState:
      "SUPPORTED",
  };
}


/* =================================================
   BITCOIN
================================================= */

type BitcoinTrackRecordInput = {
  timeline:
    ActivityTimeline;

  historyTransactionCount:
    number;

  hasNextCursor:
    boolean;

  canonicalTransaction:
    | {
        confirmed:
          boolean;

        confirmations:
          number | null;

        inputs:
          readonly unknown[];

        outputs:
          readonly unknown[];

        prevoutCoverage: {
          eligible:
            number;

          resolved:
            number;

          complete:
            boolean;
        };
      }
    | null;
};

export function buildBitcoinWalletTrackRecord(
  input:
    BitcoinTrackRecordInput
): WalletTrackRecord {
  const facts =
    timelineFacts(
      input.timeline
    );

  const range =
    observedRange(
      input.timeline
    );

  const canonical =
    input.canonicalTransaction;

  const metrics = [
    metric(
      "history-transactions",
      "Observed transactions",
      input.historyTransactionCount,
      "Transactions returned in the bounded address-history page."
    ),

    metric(
      "canonical-evidence",
      "Canonical evidence",
      canonical
        ? "Available"
        : "Unavailable",
      canonical
        ? "Canonical transaction evidence was resolved for the sampled transaction."
        : "No canonical transaction evidence is available in this analysis."
    ),

    metric(
      "confirmations",
      "Confirmations",
      canonical
        ?.confirmations ??
      "Unavailable",
      canonical
        ?.confirmed
        ? "Sampled canonical transaction is confirmed."
        : null
    ),

    metric(
      "inputs",
      "Inputs",
      canonical
        ?.inputs.length ??
      0
    ),

    metric(
      "outputs",
      "Outputs",
      canonical
        ?.outputs.length ??
      0
    ),

    metric(
      "prevout-coverage",
      "Prevout coverage",
      canonical
        ? `${canonical.prevoutCoverage.resolved}/${canonical.prevoutCoverage.eligible}`
        : "Unavailable",
      canonical
        ?.prevoutCoverage
        .complete
        ? "Eligible prevouts resolved for the sampled canonical transaction."
        : "Prevout evidence is bounded or incomplete."
    ),

    metric(
      "additional-history",
      "More history",
      input.hasNextCursor
        ? "Yes"
        : "Not indicated",
      input.hasNextCursor
        ? "Provider pagination indicates additional bounded history exists."
        : null
    ),
  ];

  return {
    status:
      facts.eventCount >
      0
        ? "limited"
        : "unavailable",

    firstObservedAt:
      range.first,

    lastObservedAt:
      range.last,

    observedSpanDays:
      spanDays(
        range
      ),

    metrics,

    limitation:
      "Bitcoin Track Record is based on the bounded address-history page and sampled canonical transaction evidence. It must not be interpreted as exhaustive lifetime activity.",

    methodology:
      "Current Bitcoin evidence does not reliably expose counterparty identity or wallet ownership. AYZO does not infer counterparties, profitability, trading skill, identity or control.",

    evidenceState:
      "SUPPORTED",
  };
}
