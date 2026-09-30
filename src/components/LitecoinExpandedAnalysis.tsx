"use client";

import type {
  LitecoinIntelligence,
} from "@/lib/intelligence/litecoin/engine";

function short(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  return value.length <=
    22
    ? value
    : `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function formatLitecoin(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  try {
    const litoshi =
      BigInt(value);

    const whole =
      litoshi /
      100_000_000n;

    const fraction =
      (
        litoshi %
        100_000_000n
      )
        .toString()
        .padStart(
          8,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} LTC`
      : `${whole} LTC`;
  } catch {
    return `${value} litoshi`;
  }
}

function Stat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
      <div className="text-[9px] tracking-[0.12em] text-zinc-700">
        {label.toUpperCase()}
      </div>

      <div className="mt-2 break-words text-sm font-medium text-zinc-200">
        {value}
      </div>
    </div>
  );
}

export default function LitecoinExpandedAnalysis({
  data,
}: {
  data:
    LitecoinIntelligence;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          LITECOIN FLOW INTELLIGENCE
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Incoming transactions"
            value={String(
              data.derived.flow.incomingTransactionCount
            )}
          />

          <Stat
            label="Outgoing transactions"
            value={String(
              data.derived.flow.outgoingTransactionCount
            )}
          />

          <Stat
            label="Self transactions"
            value={String(
              data.derived.flow.selfTransactionCount
            )}
          />

          <Stat
            label="Unresolved direction"
            value={String(
              data.derived.flow.observedTransactionCount
            )}
          />

          <Stat
            label="Observed incoming"
            value={formatLitecoin(
              data.derived.flow.incomingLitoshi
            )}
          />

          <Stat
            label="Non-target outputs"
            value={formatLitecoin(
              data.derived.flow.outgoingNonTargetLitoshi
            )}
          />

          <Stat
            label="Counterparties"
            value={String(
              data.derived.counterparties.count
            )}
          />

          <Stat
            label="Canonical verified"
            value={`${data.derived.canonicalCoverage.verified}/${data.derived.canonicalCoverage.requested}`}
          />
        </div>
      </section>

      {data.derived.observedFunding && (
        <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-emerald-400">
            OBSERVED FUNDING EVIDENCE
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Source"
              value={short(
                data.derived.observedFunding.sourceAddress
              )}
            />

            <Stat
              label="Observed amount"
              value={formatLitecoin(
                data.derived.observedFunding.amountLitoshi
              )}
            />

            <Stat
              label="Transaction"
              value={short(
                data.derived.observedFunding.transactionHash
              )}
            />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          COUNTERPARTY INTELLIGENCE
        </div>

        <div className="mt-5 space-y-2">
          {data.derived.counterparties.items.length === 0 ? (
            <div className="rounded-xl border border-zinc-900 bg-black/20 px-4 py-4 text-xs leading-5 text-zinc-600">
              No explicit counterparty relationship was resolved in the bounded canonical sample.
            </div>
          ) : (
            data.derived.counterparties.items
              .slice(0, 12)
              .map(
                counterparty => (
                <div
                  key={counterparty.address}
                  className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-4"
                >
                  <div className="font-mono text-zinc-300">
                    {short(
                      counterparty.address
                    )}
                  </div>

                  <div className="text-zinc-500">
                    Incoming:{" "}
                    {counterparty.incomingCount}
                  </div>

                  <div className="text-zinc-500">
                    Outgoing:{" "}
                    {counterparty.outgoingCount}
                  </div>

                  <div className="text-zinc-500">
                    Observations:{" "}
                    {counterparty.observationCount}
                  </div>
                </div>
                )
              )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          LITECOIN ANALYSIS DEPTH
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Plan"
            value={data.analysisPlan.toUpperCase()}
          />

          <Stat
            label="History limit"
            value={String(
              data.evidenceCoverage.historyLimit
            )}
          />

          <Stat
            label="Canonical sample limit"
            value={String(
              data.evidenceCoverage.canonicalSampleLimit
            )}
          />
        </div>

        <p className="mt-5 text-xs leading-5 text-zinc-600">
          Litecoin analysis is intentionally bounded by plan. UTXO change ownership and unresolved input sources are never inferred.
        </p>
      </section>
    </div>
  );
}
