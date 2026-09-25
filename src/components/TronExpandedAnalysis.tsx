"use client";

import type {
  TronIntelligence,
} from "@/lib/intelligence/tron/engine";

function short(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  return value.length <=
    24
    ? value
    : `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function formatTrx(
  value:
    string | null
) {
  if (!value) {
    return "0 TRX";
  }

  try {
    const sun =
      BigInt(value);

    const whole =
      sun /
      1_000_000n;

    const fraction =
      (
        sun %
        1_000_000n
      )
        .toString()
        .padStart(
          6,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} TRX`
      : `${whole} TRX`;
  } catch {
    return `${value} SUN`;
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

export default function TronExpandedAnalysis({
  data,
}: {
  data:
    TronIntelligence;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-red-300">
          TRON FLOW INTELLIGENCE
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
            label="Contract interactions"
            value={String(
              data.derived.flow.contractInteractionCount
            )}
          />

          <Stat
            label="Observed incoming"
            value={formatTrx(
              data.derived.flow.incomingSun
            )}
          />

          <Stat
            label="Observed outgoing"
            value={formatTrx(
              data.derived.flow.outgoingSun
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
                data.derived.observedFunding.sourceAddressHex
              )}
            />

            <Stat
              label="Observed amount"
              value={formatTrx(
                data.derived.observedFunding.amountSun
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
          {data.derived.counterparties.items.length ===
          0 ? (
            <div className="text-xs text-zinc-600">
              No explicit counterparty relationship resolved in the bounded canonical sample.
            </div>
          ) : (
            data.derived.counterparties.items
              .slice(0, 12)
              .map(
                counterparty => (
                  <div
                    key={counterparty.addressHex}
                    className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-4"
                  >
                    <div className="font-mono text-zinc-300">
                      {short(
                        counterparty.addressHex
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
                      Contract:{" "}
                      {counterparty.contractInteractionCount}
                    </div>
                  </div>
                )
              )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          CONTRACT & RESOURCE INTELLIGENCE
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total fee"
            value={formatTrx(
              data.derived.resources.feeSun
            )}
          />

          <Stat
            label="Energy fee"
            value={formatTrx(
              data.derived.resources.energyFeeSun
            )}
          />

          <Stat
            label="Net fee"
            value={formatTrx(
              data.derived.resources.netFeeSun
            )}
          />

          <Stat
            label="Energy usage"
            value={String(
              data.derived.resources.energyUsageTotal
            )}
          />

          <Stat
            label="Net usage"
            value={String(
              data.derived.resources.netUsage
            )}
          />

          <Stat
            label="Successful canonical"
            value={String(
              data.derived.resources.successfulCanonicalCount
            )}
          />

          <Stat
            label="Unsuccessful canonical"
            value={String(
              data.derived.resources.unsuccessfulCanonicalCount
            )}
          />

          <Stat
            label="Contract types"
            value={String(
              data.derived.contractTypes.length
            )}
          />
        </div>

        {data.derived.contractTypes.length >
          0 && (
          <div className="mt-5 space-y-2">
            {data.derived.contractTypes.map(
              item => (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs"
                >
                  <span className="text-zinc-300">
                    {item.type}
                  </span>

                  <span className="text-zinc-500">
                    {item.count}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          TRON ANALYSIS DEPTH
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
          TRON analysis is intentionally bounded by plan. Only solidified canonical evidence is used for expanded flow and relationship analysis.
        </p>
      </section>
    </div>
  );
}